import { useEffect, useState } from "react";
import { ANALYSIS_CACHE_KEY, COST_COMPARISON_ENDPOINT, FINANCIAL_ANALYSIS_ENDPOINT, REFRESH_ENDPOINT, NEWS_ENDPOINT, STORAGE_KEY } from "./constants";
import { BrokerRow, ComparisonTables, FinancialAnalysis, NewsResponse } from "./types";
import { makeApiRequest } from "./api";

// Helper: Parse fee strings to numbers
const parseFeeAmount = (feeStr: string | null | number): number => {
  if (!feeStr) return 0;
  if (typeof feeStr === "number") return feeStr;
  const cleaned = feeStr.toString().replace(/[€%]/g, "").trim();
  return parseFloat(cleaned) || 0;
};

function App() {
  const [comparisonTables, setComparisonTables] = useState<ComparisonTables | null>(null);
  const [financialAnalysis, setFinancialAnalysis] = useState<FinancialAnalysis | null>(null);
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [selectedNewsBrokers, setSelectedNewsBrokers] = useState<string[]>([]);
  const [isAnalysisPreparing, setIsAnalysisPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPendingRequest, setIsPendingRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<"tables" | "analysis">("tables");

  const hydrateFromCache = async () => {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return false;
      const parsed = JSON.parse(serialized) as {
        timestamp: string;
        data: ComparisonTables;
      };
      setComparisonTables(parsed.data);

      // Restore cached analysis if available
      const analysisSerialized = localStorage.getItem(ANALYSIS_CACHE_KEY);
      if (analysisSerialized) {
        const cachedAnalysis = JSON.parse(analysisSerialized) as FinancialAnalysis;
        setFinancialAnalysis(cachedAnalysis);
      }

      setLastUpdated(new Date(parsed.timestamp));
      setIsLoading(false);
      return true;
    } catch (err) {
      console.warn("Failed to restore cached data", err);
      return false;
    }
  };

  const fetchComparisonTables = async (isManual = false, force = false) => {
    if (isPendingRequest) return;
    setIsPendingRequest(true);
    if (!isManual && !comparisonTables) {
      setIsLoading(true);
    }
    if (isManual) {
      setIsRefreshing(true);
    }
    // Show preparing state for analysis when reloading tables
    setIsAnalysisPreparing(true);
    setError(null);

    try {
      // Build query params with force flag if provided
      const baseParams = "?model=claude-sonnet-4-20250514";
      const forceParam = force ? "&force=true" : "";
      
      // Fetch both endpoints in parallel
      const [tablesResponse, analysisResponse, newsResponse] = await Promise.all([
        makeApiRequest<ComparisonTables>(`${COST_COMPARISON_ENDPOINT}${baseParams}${forceParam}`, {
          timeout: 120000  // 2 minutes for cost comparison
        }),
        makeApiRequest<FinancialAnalysis>(`${FINANCIAL_ANALYSIS_ENDPOINT}${baseParams}${forceParam}`, {
          timeout: 180000  // 3 minutes for financial analysis (LLM analysis can take longer)
        }).catch(err => {
          console.warn("Financial analysis request failed:", err);
          return null;
        }),
        makeApiRequest<NewsResponse>(`${NEWS_ENDPOINT}${forceParam ? "?force=true" : ""}`, {
          method: 'POST',
          timeout: 120000  // 2 minutes for news scraping
        }).catch(err => {
          console.warn("News request failed:", err);
          return null;
        })
      ]);

      const tables = tablesResponse;

      if (!tables.etfs || !tables.stocks || !tables.bonds) {
        throw new Error("API response does not include valid comparison tables.");
      }

      setComparisonTables(tables);
      setLastUpdated(new Date());

      // Handle financial analysis response
      let analysis = null;
      if (analysisResponse) {
        analysis = {
          ...analysisResponse,
          generatedAt: new Date()
        };
        setFinancialAnalysis(analysis);
        // Cache the analysis
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(analysis));
      } else {
        console.warn("Financial analysis request failed, but tables loaded successfully");
      }

      // Handle news response
      if (newsResponse) {
        setNewsData(newsResponse);
      } else {
        console.warn("News request failed");
      }

      // Cache the data
      const snapshot = {
        timestamp: new Date().toISOString(),
        data: tables
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to contact API server.";
      setError(message);
      setComparisonTables(null);
      setFinancialAnalysis(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsPendingRequest(false);
      setIsAnalysisPreparing(false);
    }
  };

  const refreshData = async () => {
    setIsPendingRequest(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const url = `${REFRESH_ENDPOINT}?model=claude-sonnet-4-20250514&force=true`;
      await makeApiRequest(url, {
        method: "POST",
        body: {}
      });

      // Fetch latest comparison tables with force=true
      await fetchComparisonTables(true, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh data.";
      setError(message);
    } finally {
      setIsRefreshing(false);
      setIsPendingRequest(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const restored = await hydrateFromCache();
      if (!restored) {
        fetchComparisonTables(false);
      }
    };
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize selected brokers when news data loads
  useEffect(() => {
    if (newsData && newsData.news_items && newsData.news_items.length > 0 && selectedNewsBrokers.length === 0) {
      const allBrokers = [...new Set(newsData.news_items.map(item => item.broker))].sort();
      setSelectedNewsBrokers(allBrokers);
    }
  }, [newsData]);

  const renderComparisonTable = (rows: BrokerRow[], title: string) => {
    if (!rows || rows.length === 0) return null;

    const amounts = Object.keys(rows[0])
      .filter((k) => k !== "broker")
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Filter out rows where all values are 0
    const filteredRows = rows.filter((row) => {
      return amounts.some((amount) => {
        const value = parseFeeAmount(row[amount] as string | number);
        return value !== 0;
      });
    });

    if (filteredRows.length === 0) return null;

    // Sort rows with ING Self Invest at the top
    const sortedRows = [...filteredRows].sort((a, b) => {
      if (a.broker === "ING Self Invest") return -1;
      if (b.broker === "ING Self Invest") return 1;
      return 0;
    });

    return (
      <div className="table-container">
        <h3 className="table-title">{title}</h3>
        <div className="table-responsive">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="broker-col">Broker</th>
                {amounts.map((amount) => (
                  <th key={amount} className="amount-col">
                    €{amount}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                  <td className="broker-col broker-name">
                    <strong>{row.broker}</strong>
                  </td>
                  {amounts.map((amount) => (
                    <td key={amount} className="amount-col">
                      <span className="fee-badge">€{parseFeeAmount(row[amount] as string | number).toFixed(2) || "—"}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFinancialAnalysis = () => {
    if (isAnalysisPreparing) {
      return (
        <div className="analysis-container">
          <div className="analysis-loading">
            <h2>📊 Financial Analysis</h2>
            <div className="preparing-message">
              <p>⏳ Analysis being prepared...</p>
              <p className="preparing-subtitle">Claude is analyzing the comparison data, please wait</p>
            </div>
          </div>
        </div>
      );
    }

    if (!financialAnalysis) return null;

    // Add guards for metadata access
    if (!financialAnalysis.metadata) {
      return (
        <div className="analysis-container">
          <div className="analysis-error">
            <h2>📊 Financial Analysis</h2>
            <p>⚠️ Analysis data is incomplete. Please try reloading.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="analysis-container">
        <article className="analysis-article">
          {/* Header */}
          <div className="analysis-header">
            <div className="analysis-title-wrapper">
              <h1 className="analysis-main-title">How ING Self Invest Compares</h1>
              <h2 className="analysis-vs-title">Stack It Up Against Belgium's Top Investment Platforms</h2>
              <h3 className="analysis-subtitle-main">Which Platform Offers the Best Bang for Your Buck?</h3>
            </div>
            <p className="analysis-subtitle">{financialAnalysis.metadata.subtitle || 'How ING Self Invest compares to competitors'}</p>
            <div className="analysis-meta">
              <span className="meta-item">📅 {financialAnalysis.metadata.publishDate || new Date().toLocaleDateString()}</span>
              <span className="meta-item">⏱️ {financialAnalysis.metadata.readingTimeMinutes || 5} min read</span>
            </div>
          </div>

          {/* Executive Summary */}
          <section className="analysis-section executive-summary">
            <h2>💡 Executive Summary</h2>
            <ul className="summary-list">
              {financialAnalysis.executiveSummary?.map((point, idx) => (
                <li key={idx} className="summary-item">{point}</li>
              )) || []}
            </ul>
          </section>

          {/* Key Insights */}
          {financialAnalysis.executiveSummary && financialAnalysis.executiveSummary.length > 0 && (
            <section className="analysis-section key-insights">
              <h2>🎯 Key Takeaways</h2>
              <div className="insights-cards">
                {financialAnalysis.executiveSummary.slice(0, 2).map((insight, idx) => (
                  <div key={idx} className="insight-card">
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Main Sections - Only render if sections exist */}
          {financialAnalysis.sections?.map((section) => (
            <section key={section.id} className="analysis-section">
              <h2>{section.icon} {section.title}</h2>
              {section.content.map((item: any, idx: number) => {
                if (item.type === 'paragraph') {
                  return <p key={idx} className="section-paragraph">{item.text}</p>;
                } else if (item.type === 'table') {
                  return (
                    <div key={idx} className="table-wrapper">
                      <p className="table-caption">{item.caption}</p>
                      <table className="analysis-table">
                        <thead>
                          <tr>
                            {item.headers.map((header: string, hIdx: number) => (
                              <th key={hIdx}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.rows.map((row: any, rIdx: number) => (
                            <tr key={rIdx}>
                              <td className="broker-name">{row.broker}</td>
                              {Object.entries(row).map(([key, val]: [string, any], cIdx: number) => {
                                if (key !== 'broker' && key !== 'rating') {
                                  return <td key={cIdx}>{val}</td>;
                                }
                                return null;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                } else if (item.type === 'callout') {
                  return (
                    <div key={idx} className={`callout callout-${item.style}`}>
                      <div className="callout-content">
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </div>
                    </div>
                  );
                } else if (item.type === 'scenarios') {
                  return (
                    <div key={idx} className="scenarios-container">
                      <h3>{item.title}</h3>
                      {item.scenarios.map((scenario: any, sIdx: number) => (
                        <div key={sIdx} className="scenario">
                          <h4>{scenario.name} - Winner: <span className="winner-badge">{scenario.winner}</span></h4>
                          <div className="cost-breakdown">
                            {scenario.costs.map((cost: any, cIdx: number) => (
                              <div key={cIdx} className="cost-item">
                                <span>{cost.broker}: </span>
                                <span className="cost-value">€{cost.annual}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })}
            </section>
          ))}

          {/* Broker Comparisons - Adapted for new structure */}
          <section className="analysis-section broker-ratings">
            <h2>🏆 Broker Ratings</h2>
            <div className="ratings-grid">
              {(financialAnalysis.brokerComparisons?.sort((a, b) => {
                if (a.broker === "ING Self Invest") return -1;
                if (b.broker === "ING Self Invest") return 1;
                return 0;
              }) || []).map((broker) => (
                <div key={broker.broker} className="broker-card">
                  <div className="broker-header">
                    <h3>{broker.broker}</h3>
                    <div className="overall-rating">
                      <span className="rating-stars">{'⭐'.repeat(broker.overallRating || 0)}</span>
                      <span className="rating-number">{broker.overallRating || 0}/5</span>
                    </div>
                  </div>
                  <div className="rating-breakdown">
                    <div className="rating-row">
                      <span className="category">ETFs:</span>
                      <span className="rating-indicator">{'▓'.repeat(broker.etfRating || 0)}{'░'.repeat(5 - (broker.etfRating || 0))}</span>
                    </div>
                    <div className="rating-row">
                      <span className="category">Stocks:</span>
                      <span className="rating-indicator">{'▓'.repeat(broker.stockRating || 0)}{'░'.repeat(5 - (broker.stockRating || 0))}</span>
                    </div>
                    <div className="rating-row">
                      <span className="category">Bonds:</span>
                      <span className="rating-indicator">{'▓'.repeat(broker.bondRating || 0)}{'░'.repeat(5 - (broker.bondRating || 0))}</span>
                    </div>
                  </div>
                  <div className="pros-cons">
                    <div className="pros">
                      <strong>✓ Pros</strong>
                      <ul>
                        {broker.pros?.map((pro, idx) => <li key={idx}>{pro}</li>) || []}
                      </ul>
                    </div>
                    <div className="cons">
                      <strong>✗ Cons</strong>
                      <ul>
                        {broker.cons?.map((con, idx) => <li key={idx}>{con}</li>) || []}
                      </ul>
                    </div>
                  </div>
                  <div className="best-for">
                    <strong>Best for:</strong>
                    <p>{broker.bestFor?.join(', ') || 'General investing'}</p>
                  </div>
                </div>
              )) || []}
            </div>
          </section>

          {/* Category Winners - Adapted for new structure */}
          {financialAnalysis.categoryWinners && (
            <section className="analysis-section recommendations">
              <h2>✨ Category Winners</h2>
              <div className="winners-list">
                <div className="winner-card">
                  <h3>Best for ETFs</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.etfs?.winner || 'N/A'}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.etfs?.reason || ''}</p>
                </div>
                <div className="winner-card">
                  <h3>Best for Stocks</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.stocks?.winner || 'N/A'}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.stocks?.reason || ''}</p>
                </div>
                <div className="winner-card">
                  <h3>Best for Bonds</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.bonds?.winner || 'N/A'}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.bonds?.reason || ''}</p>
                </div>
                <div className="winner-card">
                  <h3>Best Overall</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.overall?.winner || 'N/A'}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.overall?.reason || ''}</p>
                </div>
              </div>
            </section>
          )}

          {/* Cost Comparison Scenarios */}
          {financialAnalysis.costComparison && (
            <section className="analysis-section investment-scenarios">
              <h2>💰 Cost Comparison Scenarios</h2>
              <div className="scenarios-grid">
                <div className="scenario-card">
                  <h3>🎯 Monthly €500 ETF Investor</h3>
                  <p className="scenario-profile">Investing €500/month in ETFs</p>
                  <div className="scenario-costs">
                    {financialAnalysis.costComparison.monthly500ETF?.sort((a, b) => {
                      if (a.broker === "ING Self Invest") return -1;
                      if (b.broker === "ING Self Invest") return 1;
                      return 0;
                    }).map((cost, idx) => (
                      <div key={idx} className={`cost-row ${cost.annualCost === 0 ? 'winner' : ''}`}>
                        <span className="broker">{cost.broker}</span>
                        <span className="amount">€{cost.annualCost}/yr</span>
                      </div>
                    )) || []}
                  </div>
                </div>
                <div className="scenario-card">
                  <h3>⚡ Active Trader</h3>
                  <p className="scenario-profile">High-frequency trading across markets</p>
                  <div className="scenario-costs">
                    {financialAnalysis.costComparison.activeTrader?.sort((a, b) => {
                      if (a.broker === "ING Self Invest") return -1;
                      if (b.broker === "ING Self Invest") return 1;
                      return 0;
                    }).map((cost, idx) => {
                      const minCost = Math.min(...(financialAnalysis.costComparison.activeTrader?.sort((a, b) => {
                        if (a.broker === "ING Self Invest") return -1;
                        if (b.broker === "ING Self Invest") return 1;
                        return 0;
                      }).map(c => c.annualCost) || [Infinity]));
                      return (
                        <div key={idx} className={`cost-row ${cost.annualCost === minCost ? 'winner' : ''}`}>
                          <span className="broker">{cost.broker}</span>
                          <span className="amount">€{cost.annualCost}/yr</span>
                        </div>
                      );
                    }) || []}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <section className="analysis-section disclaimer-section">
            <p className="disclaimer">
              ⚠️ <strong>Disclaimer:</strong> {financialAnalysis.disclaimer || 'Fee information based on publicly available data and may change. Always verify current rates with brokers directly before making investment decisions.'}
            </p>
          </section>
        </article>
      </div>
    );
  };

  const renderNewsFlashes = () => {
    const hasNews = newsData && newsData.news_items && newsData.news_items.length > 0;
    
    // Get unique brokers from news data
    const allBrokers = hasNews 
      ? [...new Set(newsData.news_items.map(item => item.broker))].sort()
      : [];
    
    if (!hasNews) {
      return (
        <div className="news-ticker-container">
          {/* Ticker Header */}
          <div className="ticker-header">
            <div className="ticker-label">
              <span className="breaking-icon">📰</span>
              <span className="breaking-text">MARKET NEWS</span>
            </div>
            <div className="ticker-stats">
              <span>No news available at the moment</span>
            </div>
          </div>

          {/* Empty Ticker */}
          <div className="ticker-wrapper ticker-empty">
            <div className="ticker-content ticker-empty-content">
              <div className="ticker-item">
                <div className="ticker-ribbon">
                  <span className="ribbon-broker">NEWS</span>
                </div>
                <span className="empty-message">No news items available at the moment • Check back soon for the latest market updates</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="ticker-footer">
            <p>News items are automatically scraped and updated. Check back soon for updates.</p>
          </div>
        </div>
      );
    }

    // Filter news based on selected brokers
    const filteredNews = newsData.news_items.filter(item => 
      selectedNewsBrokers.includes(item.broker)
    );

    // Sort all news items with ING brokers first
    const sortedNews = [...filteredNews].sort((a, b) => {
      if (a.broker === "ING Self Invest") return -1;
      if (b.broker === "ING Self Invest") return 1;
      return 0;
    });

    return (
      <div className="news-ticker-container">
        {/* Ticker Header */}
        <div className="ticker-header">
          <div className="ticker-label">
            <span className="breaking-icon">📰</span>
            <span className="breaking-text">MARKET NEWS</span>
          </div>
          <div className="ticker-filters">
            <label className="filter-label">Filter by Broker:</label>
            <div className="broker-filter-chips">
              {allBrokers.map((broker) => (
                <button
                  key={broker}
                  className={`filter-chip ${selectedNewsBrokers.includes(broker) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedNewsBrokers(prev => 
                      prev.includes(broker)
                        ? prev.filter(b => b !== broker)
                        : [...prev, broker]
                    );
                  }}
                >
                  {broker}
                </button>
              ))}
            </div>
          </div>
          <div className="ticker-stats">
            <span>{sortedNews.length} articles shown</span>
          </div>
        </div>

        {sortedNews.length === 0 ? (
          <div className="ticker-wrapper ticker-empty">
            <div className="ticker-content ticker-empty-content">
              <div className="ticker-item">
                <div className="ticker-ribbon">
                  <span className="ribbon-broker">FILTER</span>
                </div>
                <span className="empty-message">No news items match your selected brokers. Try selecting different brokers to see more news.</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Scrolling Ticker */}
            <div className="ticker-wrapper">
              <div className="ticker-content">
                {sortedNews.map((item, idx) => (
                  <div key={idx} className="ticker-item">
                    <div className="ticker-ribbon">
                      <span className="ribbon-broker">{item.broker}</span>
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ticker-link"
                  title={item.title}
                >
                  <span className="ticker-title">{item.title}</span>
                  <span className="ticker-separator">•</span>
                  <span className="ticker-summary">{item.summary}</span>
                </a>
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {sortedNews.map((item, idx) => (
              <div key={`dup-${idx}`} className="ticker-item">
                <div className="ticker-ribbon">
                  <span className="ribbon-broker">{item.broker}</span>
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ticker-link"
                  title={item.title}
                >
                  <span className="ticker-title">{item.title}</span>
                  <span className="ticker-separator">•</span>
                  <span className="ticker-summary">{item.summary}</span>
                </a>
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {sortedNews.map((item, idx) => (
              <div key={`dup-${idx}`} className="ticker-item">
                <div className="ticker-ribbon">
                  <span className="ribbon-broker">{item.broker}</span>
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ticker-link"
                  title={item.title}
                >
                  <span className="ticker-title">{item.title}</span>
                  <span className="ticker-separator">•</span>
                  <span className="ticker-summary">{item.summary}</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="ticker-footer">
          <p>News items are automatically scraped and updated. Click to read full story.</p>
        </div>
          </>
        )}
      </div>
    );
  };

  return (
    <main className="page">
      {/* News Ticker - Top of Page */}
      {renderNewsFlashes()}

      <header className="page__header">
        <div>
          <p className="page__eyebrow">Investment Platform Analysis</p>
          <h1>Belgian Online Investing Platforms</h1>
          <p>
            Compare investment platforms and trading costs across Belgium's most popular online brokers. Discover which platform offers the best fees for your investment strategy—whether you're trading ETFs, individual stocks, or bonds. Data-driven insights to help investors optimize their trading costs.
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      {comparisonTables && (
        <section className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "tables" ? "active" : ""}`}
            onClick={() => setActiveTab("tables")}
          >
            📊 Comparison Tables
          </button>
          <button
            className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`}
            onClick={() => setActiveTab("analysis")}
          >
            💡 Financial Analysis
          </button>
        </section>
      )}

      {/* Content */}
      {comparisonTables && activeTab === "tables" && (
        <section className="tables-section">
          {renderComparisonTable(comparisonTables.etfs, "📈 ETFs Comparison")}
          {renderComparisonTable(comparisonTables.stocks, "📉 Stocks Comparison")}
          {renderComparisonTable(comparisonTables.bonds, "💳 Bonds Comparison")}

          {comparisonTables.notes && Object.keys(comparisonTables.notes).length > 0 && (
            <section className="notes-section">
              <h3>📝 Broker Notes</h3>
              <div className="notes-grid">
                {Object.entries(comparisonTables.notes)
                  .sort((a, b) => {
                    if (a[0] === "ING Self Invest") return -1;
                    if (b[0] === "ING Self Invest") return 1;
                    return 0;
                  })
                  .map(([broker, noteObj]) => (
                  <div key={broker} className="note-card">
                    <h4>{broker}</h4>
                    {typeof noteObj === "object" &&
                      Object.entries(noteObj).map(([key, value]) => (
                        <p key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </p>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

      {comparisonTables && activeTab === "analysis" && renderFinancialAnalysis()}

      {isLoading && !comparisonTables && (
        <section className="panel placeholder">⏳ Loading broker comparison data...</section>
      )}

      {!isLoading && !comparisonTables && !error && (
        <section className="panel placeholder">
          🔍 No pricing data available. Click "Reload Tables" to fetch data.
        </section>
      )}

      {/* Control Panel - Bottom */}
      <section className="panel control-panel">
        <div className="control-left"></div>

        <div className="control-right">
          <button
            className="primary-btn"
            onClick={() => refreshData()}
            disabled={isPendingRequest}
          >
            {isRefreshing ? "⏳ Updating..." : "🔄 Refresh Data"}
          </button>
          <button
            className="secondary-btn"
            onClick={() => fetchComparisonTables(false)}
            disabled={isPendingRequest}
          >
            {isLoading ? "Loading..." : "📊 Reload Tables"}
          </button>
        </div>

        <div className="status-info">
          {isLoading && !comparisonTables && <span>⏳ Loading cost comparison tables...</span>}
          {isRefreshing && comparisonTables && <span>🔄 Updating in background...</span>}
          {lastUpdated && !isLoading && !isRefreshing && (
            <span>
              ✓ Last updated{" "}
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>
    </main>
  );
}

export default App;
