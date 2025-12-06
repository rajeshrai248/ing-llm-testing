import { useEffect, useState } from "react";
import { ANALYSIS_CACHE_KEY, COST_COMPARISON_ENDPOINT, FINANCIAL_ANALYSIS_ENDPOINT, REFRESH_ENDPOINT, STORAGE_KEY } from "./constants";
import { BrokerRow, ComparisonTables, FinancialAnalysis } from "./types";

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

  const fetchComparisonTables = async (isManual = false) => {
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
      // Fetch both endpoints in parallel
      const [tablesResponse, analysisResponse] = await Promise.all([
        fetch(`${COST_COMPARISON_ENDPOINT}?model=claude-sonnet-4-20250514`),
        fetch(`${FINANCIAL_ANALYSIS_ENDPOINT}?model=claude-sonnet-4-20250514`)
      ]);

      if (!tablesResponse.ok) {
        throw new Error(`Cost comparison API request failed (${tablesResponse.status} ${tablesResponse.statusText}).`);
      }

      const tables = (await tablesResponse.json()) as ComparisonTables;

      if (!tables.etfs || !tables.stocks || !tables.bonds) {
        throw new Error("API response does not include valid comparison tables.");
      }

      setComparisonTables(tables);
      setLastUpdated(new Date());

      // Handle financial analysis response
      let analysis = null;
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json() as FinancialAnalysis;
        analysis = {
          ...analysisData,
          generatedAt: new Date()
        };
        setFinancialAnalysis(analysis);
        // Cache the analysis
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(analysis));
      } else {
        console.warn("Financial analysis request failed, but tables loaded successfully:", analysisResponse.status, analysisResponse.statusText);
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
      const url = `${REFRESH_ENDPOINT}?model=claude-sonnet-4-20250514`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`Refresh failed (${response.status} ${response.statusText}).`);
      }

      await response.json();

      // Fetch latest comparison tables
      await fetchComparisonTables(true);
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

  const renderComparisonTable = (rows: BrokerRow[], title: string) => {
    if (!rows || rows.length === 0) return null;

    const amounts = Object.keys(rows[0])
      .filter((k) => k !== "broker")
      .sort((a, b) => parseInt(a) - parseInt(b));

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
              {rows.map((row, idx) => (
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
            <h1>{financialAnalysis.metadata.title || 'Financial Analysis'}</h1>
            <p className="analysis-subtitle">{financialAnalysis.metadata.subtitle || 'Comprehensive broker fee analysis'}</p>
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
                <li key={idx}>{point}</li>
              )) || []}
            </ul>
          </section>

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
              {financialAnalysis.brokerComparisons?.map((broker) => (
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
                    {financialAnalysis.costComparison.monthly500ETF?.map((cost, idx) => (
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
                    {financialAnalysis.costComparison.activeTrader?.map((cost, idx) => {
                      const minCost = Math.min(...(financialAnalysis.costComparison.activeTrader?.map(c => c.annualCost) || [Infinity]));
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

  return (
    <main className="page">
      <header className="page__header">
        <div>
          <p className="page__eyebrow">Belgian Broker Comparison</p>
          <h1>Smart Broker Fee Analysis</h1>
          <p>
            Compare transaction costs across Belgian brokers for ETFs, stocks, and bonds. Real-time
            pricing analysis powered by AI insights.
          </p>
        </div>
      </header>

      {/* Control Panel */}
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
                {Object.entries(comparisonTables.notes).map(([broker, noteObj]) => (
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
    </main>
  );
}

export default App;
