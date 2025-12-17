import { useEffect, useState } from "react";
import { ANALYSIS_CACHE_KEY, COST_COMPARISON_ENDPOINT, FINANCIAL_ANALYSIS_ENDPOINT, REFRESH_ENDPOINT, STORAGE_KEY, NEWS_SCRAPE_ENDPOINT } from "./constants";
import { BrokerRow, ComparisonTables, FinancialAnalysis, NewsResponse } from "./types";
import { makeApiRequest } from "./api";

// Helper: Parse fee strings to numbers
const parseFeeAmount = (feeStr: string | null | number): number => {
  if (!feeStr) return 0;
  if (typeof feeStr === "number") return feeStr;
  const cleaned = feeStr.toString().replace(/[€%]/g, "").trim();
  return parseFloat(cleaned) || 0;
};

// Helper: Map broker names for display
const mapBrokerName = (brokerName: string): string => {
  const brokerNameMap: Record<string, string> = {
    'Rebel': 'ReBel'
  };
  return brokerNameMap[brokerName] || brokerName;
};

// Helper to highlight cost values in text
const highlightCosts = (text: string): React.ReactNode => {
  // Pattern to match € amounts, percentages, and fees
  const parts = text.split(/(\€[0-9.,]+(?:\/[a-z]+)?|[0-9]+(?:\.[0-9]+)?%)/gi);
  
  return parts.map((part, idx) => {
    if (/(\€[0-9.,]+(?:\/[a-z]+)?|[0-9]+(?:\.[0-9]+)?%)/.test(part)) {
      return (
        <span key={idx} className="cost-highlight">
          {part}
        </span>
      );
    }
    return part;
  });
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
    setIsAnalysisPreparing(true);
    setError(null);

    try {
      // Build query params with force flag if provided
      const forceParam = force ? "?force_refresh=true" : "";
      const modelParam = "?model=claude-sonnet-4-20250514";
      const costComparisonParams = force ? `${forceParam}&model=claude-sonnet-4-20250514` : modelParam;
      
      // Only call refresh-and-analyze if this is a manual refresh
      if (isManual) {
        console.log('Calling refresh-and-analyze endpoint...');
        await makeApiRequest(`${REFRESH_ENDPOINT}${forceParam}`, {
          method: 'POST',
          timeout: 300000  // 5 minutes for analysis
        });
      }
      
      // Fetch cost comparison tables, news, and financial analysis in parallel
      const [costComparisonResponse, newsResponse, analysisResponse] = await Promise.all([
        makeApiRequest<ComparisonTables>(`${COST_COMPARISON_ENDPOINT}${costComparisonParams}`, {
          method: 'GET',
          timeout: 120000
        }).catch(err => {
          console.warn("Cost comparison request failed:", err);
          return null;
        }),
        makeApiRequest<NewsResponse>(`${NEWS_SCRAPE_ENDPOINT}`, {
          method: 'POST',
          timeout: 120000
        }).catch(err => {
          console.warn("News request failed:", err);
          return null;
        }),
        makeApiRequest<FinancialAnalysis>(`${FINANCIAL_ANALYSIS_ENDPOINT}${costComparisonParams}`, {
          method: 'GET',
          timeout: 120000
        }).catch(err => {
          console.warn("Financial analysis request failed:", err);
          return null;
        })
      ]);

      // Handle the new response structure with euronext_brussels wrapper
      if (costComparisonResponse) {
        let processedData: ComparisonTables;
        
        // Check if response has euronext_brussels structure (new format)
        if ('euronext_brussels' in costComparisonResponse) {
          const exchangeData = costComparisonResponse.euronext_brussels;
          processedData = {
            etfs: exchangeData?.etfs || [],
            stocks: exchangeData?.stocks || [],
            bonds: exchangeData?.bonds || [],
            notes: exchangeData?.notes || {},
            calculation_logic: exchangeData?.calculation_logic || {},
            fee_structure_analysis: (costComparisonResponse as any).fee_structure_analysis || {}
          };
        } else {
          // Fallback to old format
          processedData = {
            etfs: costComparisonResponse.etfs || [],
            stocks: costComparisonResponse.stocks || [],
            bonds: costComparisonResponse.bonds || [],
            notes: costComparisonResponse.notes || {},
            calculation_logic: (costComparisonResponse as any).calculation_logic || {},
            fee_structure_analysis: (costComparisonResponse as any).fee_structure_analysis || {}
          };
        }
        
        setComparisonTables(processedData);
        setLastUpdated(new Date());
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: processedData
        }));
      }

      // Handle financial analysis response
      if (analysisResponse) {
        setFinancialAnalysis(analysisResponse);
        const analysisCache = {
          timestamp: new Date().toISOString(),
          data: analysisResponse
        };
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(analysisCache));
      } else {
        console.warn("Financial analysis request failed");
      }

      // Handle news response
      if (newsResponse) {
        setNewsData(newsResponse);
      } else {
        console.warn("News request failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to contact API server.";
      setError(message);
      setComparisonTables(null);
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
      // Call fetchComparisonTables with force=true parameter
      // This will trigger refresh-and-analyze first
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

  // Handle F5 and Ctrl+R/Cmd+R to reload tables
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F5 key
      if (event.key === 'F5') {
        event.preventDefault();
        console.log('F5 pressed - fetching latest data');
        fetchComparisonTables(false, false);
      }
      // Ctrl+R (Windows/Linux) or Cmd+R (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        console.log('Ctrl+R/Cmd+R pressed - fetching latest data');
        fetchComparisonTables(false, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);



  const renderComparisonTable = (rows: BrokerRow[], title: string, instrumentType: 'etfs' | 'stocks' | 'bonds' = 'etfs') => {
    if (!rows || rows.length === 0) return null;

    // Filter out Revolut and Degiro Belgium for bonds section
    let filteredByBroker = rows;
    if (instrumentType === 'bonds') {
      filteredByBroker = rows.filter(row => row.broker !== 'Revolut' && row.broker !== 'Degiro Belgium');
    }

    const amounts = Object.keys(filteredByBroker[0])
      .filter((k) => k !== "broker")
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Filter out rows where all values are 0 or null
    const filteredRows = filteredByBroker.filter((row) => {
      return amounts.some((amount) => {
        const value = row[amount];
        if (value === null) return false;
        
        // Handle both old format (string/number) and new format (object with total_cost)
        if (typeof value === 'object' && value !== null && 'total_cost' in value) {
          const totalCost = (value as any).total_cost;
          const parsed = parseFeeAmount(totalCost);
          return parsed !== 0;
        }
        
        if (typeof value === 'object') return false;
        const parsed = parseFeeAmount(value as string | number);
        return parsed !== 0;
      });
    });

    if (filteredRows.length === 0) return null;

    // Sort rows with ING Self Invest at the top
    const sortedRows = [...filteredRows].sort((a, b) => {
      if (a.broker === "ING Self Invest") return -1;
      if (b.broker === "ING Self Invest") return 1;
      return 0;
    });

    // Helper to get calculation logic for a broker and amount
    const getCalculationLogic = (broker: string, amount: string): string | null => {
      const logic = comparisonTables?.calculation_logic?.[broker]?.[instrumentType]?.[amount];
      return logic || null;
    };

    // Helper to extract total cost from value
    const getTotalCost = (value: any): number => {
      if (value === null) return 0;
      if (typeof value === 'object' && 'total_cost' in value) {
        return parseFeeAmount(value.total_cost);
      }
      return parseFeeAmount(value);
    };

    // Helper to extract handling fee from value
    const getHandlingFee = (value: any): number => {
      if (typeof value === 'object' && 'handling_fee' in value) {
        return parseFeeAmount(value.handling_fee);
      }
      return 0;
    };

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
                    <strong>{mapBrokerName(row.broker)}</strong>
                  </td>
                  {amounts.map((amount) => {
                    const value = row[amount];
                    const isNull = value === null;
                    const totalCost = getTotalCost(value);
                    const handlingFee = getHandlingFee(value);
                    const calculation = getCalculationLogic(row.broker, amount);
                    
                    return (
                      <td key={amount} className="amount-col">
                        {isNull ? (
                          <span className="fee-badge fee-unavailable">N/A</span>
                        ) : (
                          <div className="fee-with-tooltip">
                            <span className="fee-badge" title={calculation || 'No details available'}>
                              €{totalCost.toFixed(2)}
                            </span>
                            {handlingFee > 0 && (
                              <span className="handling-fee-badge" title="Includes handling fee">
                                +€{handlingFee.toFixed(2)}
                              </span>
                            )}
                            {calculation && (
                              <div className="tooltip-content">
                                <div className="tooltip-text">{calculation}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
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
              <h1 className="analysis-main-title">{financialAnalysis.metadata.title || 'Broker Comparison Analysis'}</h1>
              <h2 className="analysis-vs-title">{financialAnalysis.metadata.subtitle || 'How brokers compare to competitors'}</h2>
            </div>
            <p className="analysis-subtitle">{financialAnalysis.metadata.subtitle || 'Detailed comparison of investment platform fees'}</p>
            <div className="analysis-meta">
              <span className="meta-item">📅 {financialAnalysis.metadata.publishDate || new Date().toLocaleDateString()}</span>
              <span className="meta-item">⏱️ {financialAnalysis.metadata.readingTimeMinutes || 5} min read</span>
            </div>
          </div>

          {/* Executive Summary */}
          <section className="analysis-section executive-summary">
            <h2>
              💡{' '}
              {typeof financialAnalysis.executiveSummary === 'object' && financialAnalysis.executiveSummary !== null && 'headline' in financialAnalysis.executiveSummary
                ? (financialAnalysis.executiveSummary as any).headline
                : 'Executive Summary'}
            </h2>
            <ul className="summary-list">
              {typeof financialAnalysis.executiveSummary === 'object' && financialAnalysis.executiveSummary !== null && 'points' in financialAnalysis.executiveSummary
                ? (financialAnalysis.executiveSummary as any).points.map((point: string, idx: number) => (
                    <li key={idx} className="summary-item">{point}</li>
                  ))
                : Array.isArray(financialAnalysis.executiveSummary)
                ? (financialAnalysis.executiveSummary as any[]).map((point: string, idx: number) => (
                    <li key={idx} className="summary-item">{point}</li>
                  ))
                : []}
            </ul>
          </section>

          {/* Key Insights */}
          {typeof financialAnalysis.executiveSummary === 'object' && financialAnalysis.executiveSummary !== null && 'points' in financialAnalysis.executiveSummary && (financialAnalysis.executiveSummary as any).points.length > 0 && (
            <section className="analysis-section key-insights">
              <h2>🎯 Key Takeaways</h2>
              <div className="insights-cards">
                {(financialAnalysis.executiveSummary as any).points.slice(0, 2).map((insight: string, idx: number) => (
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
                              <td className="broker-name">{mapBrokerName(row.broker)}</td>
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
                          <h4>{scenario.name} - Winner: <span className="winner-badge">{mapBrokerName(scenario.winner)}</span></h4>
                          <div className="cost-breakdown">
                            {scenario.costs.map((cost: any, cIdx: number) => (
                              <div key={cIdx} className="cost-item">
                                <span>{mapBrokerName(cost.broker)}: </span>
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

          {/* Market Analysis */}
          {financialAnalysis.market_analysis && (
            <section className="analysis-section market-analysis-section">
              <h2>📈 Market Analysis</h2>
              <div className="market-analysis-content">
                {financialAnalysis.market_analysis.content_paragraphs?.map((paragraph: string, idx: number) => (
                  <p key={idx} className="market-analysis-paragraph">{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          {/* Cheapest Per Scenario */}
          {financialAnalysis.cheapest_per_scenario && (
            <section className="analysis-section cheapest-scenario">
              <h2>🎯 Cheapest Per Scenario</h2>
              <div className="cheapest-scenarios-wrapper">
                {Object.entries(financialAnalysis.cheapest_per_scenario).map(([instrumentType, amounts]) => (
                  <div key={instrumentType} className="cheapest-instrument">
                    <h3>{instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)}</h3>
                    <div className="cheapest-table">
                      <div className="cheapest-header">
                        <span className="col-amount">Amount</span>
                        <span className="col-winner">Cheapest Broker</span>
                        <span className="col-cost">Annual Cost</span>
                      </div>
                      {Object.entries(amounts as Record<string, any>).map(([amount, data]: [string, any]) => (
                        <div key={`${instrumentType}-${amount}`} className="cheapest-row">
                          <span className="col-amount">{amount}</span>
                          <span className="col-winner">{mapBrokerName(data.winner)}</span>
                          <span className="col-cost">€{data.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cheapest Per Tier */}
          {financialAnalysis.cheapestPerTier && (
            <section className="analysis-section cheapest-per-tier">
              <h2>💰 Cheapest Per Tier</h2>
              <div className="tier-wrapper">
                {financialAnalysis.cheapestPerTier.stocks && Object.keys(financialAnalysis.cheapestPerTier.stocks).length > 0 && (
                  <div className="tier-section">
                    <h3>📉 Stocks</h3>
                    <div className="tier-list">
                      {Object.entries(financialAnalysis.cheapestPerTier.stocks).map(([tier, winner]: [string, any]) => (
                        <div key={`stocks-${tier}`} className="tier-item">
                          <span className="tier-amount">€{tier}</span>
                          <span className="tier-winner">{winner}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {financialAnalysis.cheapestPerTier.etfs && Object.keys(financialAnalysis.cheapestPerTier.etfs).length > 0 && (
                  <div className="tier-section">
                    <h3>📈 ETFs</h3>
                    <div className="tier-list">
                      {Object.entries(financialAnalysis.cheapestPerTier.etfs).map(([tier, winner]: [string, any]) => (
                        <div key={`etfs-${tier}`} className="tier-item">
                          <span className="tier-amount">€{tier}</span>
                          <span className="tier-winner">{winner}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {financialAnalysis.cheapestPerTier.bonds && Object.keys(financialAnalysis.cheapestPerTier.bonds).length > 0 && (
                  <div className="tier-section">
                    <h3>💳 Bonds</h3>
                    <div className="tier-list">
                      {Object.entries(financialAnalysis.cheapestPerTier.bonds).map(([tier, winner]: [string, any]) => (
                        <div key={`bonds-${tier}`} className="tier-item">
                          <span className="tier-amount">€{tier}</span>
                          <span className="tier-winner">{winner}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Annual Cost Simulation */}
          {financialAnalysis.annualCostSimulation && (
            <section className="analysis-section annual-cost-simulation">
              <h2>📊 Annual Cost Simulation</h2>
              <p className="simulation-description">Cost comparison for different investor types</p>
              <div className="simulation-table-wrapper">
                <table className="simulation-table">
                  <thead>
                    <tr>
                      <th>Broker</th>
                      <th className="passive-col">Passive Investor <span className="trades-label">(12/month)</span></th>
                      <th className="active-col">Active Trader <span className="trades-label">(120/month)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialAnalysis.annualCostSimulation
                      .sort((a: any, b: any) => {
                        if (a.broker === "ING Self Invest") return -1;
                        if (b.broker === "ING Self Invest") return 1;
                        return 0;
                      })
                      .map((simulation: any) => {
                        const passiveEvidence = financialAnalysis.costEvidence?.passiveInvestor?.[simulation.broker];
                        const activeEvidence = financialAnalysis.costEvidence?.activeTrader?.[simulation.broker];
                        return (
                          <tr key={simulation.broker}>
                            <td className="broker-name">{mapBrokerName(simulation.broker)}</td>
                            <td className="cost-cell passive-cost-wrapper">
                              <div className="cost-tooltip-trigger" data-tooltip={passiveEvidence || 'Cost breakdown'}>
                                €{simulation.passiveInvestorCost}/year
                              </div>
                            </td>
                            <td className="cost-cell active-cost-wrapper">
                              <div className="cost-tooltip-trigger" data-tooltip={activeEvidence || 'Cost breakdown'}>
                                €{simulation.activeTraderCost}/year
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Broker Comparisons - Adapted for new structure */}
          <section className="analysis-section broker-ratings">
            <h2>🏆 Broker Comparisons</h2>
            <div className="ratings-grid">
              {(financialAnalysis.brokerComparisons?.sort((a, b) => {
                if (a.broker === "ING Self Invest") return -1;
                if (b.broker === "ING Self Invest") return 1;
                return 0;
              }) || []).map((broker: any) => (
                <div key={broker.broker} className="broker-card">
                  <div className="broker-header">
                    <h3>{mapBrokerName(broker.broker)}</h3>
                    {broker.badges && (
                      <div className="broker-badges">
                        {broker.badges.map((badge: string, idx: number) => (
                          <span key={idx} className="badge">{badge}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {broker.ratings && (
                    <div className="rating-breakdown">
                      <div className="rating-row">
                        <span className="category">Overall:</span>
                        <span className="rating-value">{broker.ratings.overall || 0}/5</span>
                      </div>
                      <div className="rating-row">
                        <span className="category">Fees:</span>
                        <span className="rating-value">{broker.ratings.fees || 0}/5</span>
                      </div>
                      <div className="rating-row">
                        <span className="category">Platform:</span>
                        <span className="rating-value">{broker.ratings.platform || 0}/5</span>
                      </div>
                    </div>
                  )}

                  {broker.verdict && (
                    <p className="broker-verdict"><em>{broker.verdict}</em></p>
                  )}

                  <div className="pros-cons">
                    {broker.pros && (
                      <div className="pros">
                        <strong>✓ Pros</strong>
                        <ul>
                          {broker.pros.map((pro: string, idx: number) => <li key={idx}>{pro}</li>)}
                        </ul>
                      </div>
                    )}
                    {broker.cons && (
                      <div className="cons">
                        <strong>✗ Cons</strong>
                        <ul>
                          {broker.cons.map((con: string, idx: number) => <li key={idx}>{con}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {broker.uniqueSellingPoint && (
                    <div className="unique-selling-point">
                      <strong>💡 USP:</strong>
                      <p>{broker.uniqueSellingPoint}</p>
                    </div>
                  )}

                  {broker.hidden_costs_note && (
                    <div className="hidden-costs-note">
                      <strong>⚠️ Hidden Costs:</strong>
                      <p>{broker.hidden_costs_note}</p>
                    </div>
                  )}
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
                {/* Passive Investor */}
                {financialAnalysis.costComparison.passiveInvestor && (
                  <div className="scenario-card">
                    <h3>🎯 Passive Investor</h3>
                    <p className="scenario-profile">Monthly €500 ETF investment (12 trades/year)</p>
                    <div className="scenario-costs">
                      {financialAnalysis.costComparison.passiveInvestor
                        .sort((a, b) => a.annualCost - b.annualCost)
                        .map((cost, idx) => {
                          const minCost = Math.min(...(financialAnalysis.costComparison?.passiveInvestor?.map(c => c.annualCost) || [Infinity]));
                          return (
                            <div key={idx} className={`cost-row ${cost.annualCost === minCost ? 'winner' : ''}`}>
                              <span className="broker">{mapBrokerName(cost.broker)}</span>
                              <span className="amount">€{cost.annualCost}/yr</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Active Trader */}
                {financialAnalysis.costComparison.activeTrader && (
                  <div className="scenario-card">
                    <h3>⚡ Active Trader</h3>
                    <p className="scenario-profile">High-frequency trading (120 trades/year)</p>
                    <div className="scenario-costs">
                      {financialAnalysis.costComparison.activeTrader
                        .sort((a, b) => a.annualCost - b.annualCost)
                        .map((cost, idx) => {
                          const minCost = Math.min(...(financialAnalysis.costComparison?.activeTrader?.map(c => c.annualCost) || [Infinity]));
                          return (
                            <div key={idx} className={`cost-row ${cost.annualCost === minCost ? 'winner' : ''}`}>
                              <span className="broker">{mapBrokerName(cost.broker)}</span>
                              <span className="amount">€{cost.annualCost}/yr</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Fallback to old format */}
                {!financialAnalysis.costComparison.passiveInvestor && financialAnalysis.costComparison.monthly500ETF && (
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
                          <span className="broker">{mapBrokerName(cost.broker)}</span>
                          <span className="amount">€{cost.annualCost}/yr</span>
                        </div>
                      )) || []}
                    </div>
                  </div>
                )}

                {/* Old format activeTrader fallback */}
                {!financialAnalysis.costComparison.activeTrader && financialAnalysis.costComparison.monthly500ETF && (
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
                            <span className="broker">{mapBrokerName(cost.broker)}</span>
                            <span className="amount">€{cost.annualCost}/yr</span>
                          </div>
                        );
                      }) || []}
                    </div>
                  </div>
                )}
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
                  {mapBrokerName(broker)}
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
                      <span className="ribbon-broker">{mapBrokerName(item.broker)}</span>
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
                  <span className="ribbon-broker">{mapBrokerName(item.broker)}</span>
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
                  <span className="ribbon-broker">{mapBrokerName(item.broker)}</span>
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
        <>
        <section className="tables-section">
          {renderComparisonTable(comparisonTables.etfs, "📈 ETFs Comparison", "etfs")}
          {renderComparisonTable(comparisonTables.stocks, "📉 Stocks Comparison", "stocks")}

          {comparisonTables.notes && Object.keys(comparisonTables.notes).length > 0 && (
            <section className="notes-section">
              <h2>📋 Important Broker Information</h2>
              <div className="notes-list">
                {Object.entries(comparisonTables.notes)
                  .sort((a, b) => {
                    if (a[0] === "ING Self Invest") return -1;
                    if (b[0] === "ING Self Invest") return 1;
                    return 0;
                  })
                  .map(([broker, noteContent]) => {
                    const brokerName = mapBrokerName(broker);
                    const noteText = typeof noteContent === "string" ? noteContent : "";
                    
                    return (
                      <div key={broker} className="note-item-row">
                        <div className="note-broker-name">{brokerName}</div>
                        <div className="note-text-content">
                          {typeof noteContent === "string" ? (
                            <p>{highlightCosts(noteContent)}</p>
                          ) : typeof noteContent === "object" && noteContent !== null ? (
                            <div>
                              {Object.entries(noteContent).map(([key, value]) => (
                                <p key={key}>
                                  <strong>{key}:</strong> {highlightCosts(String(value))}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p>{String(noteContent)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </section>

        {comparisonTables.fee_structure_analysis && Object.keys(comparisonTables.fee_structure_analysis).length > 0 && (
          <section className="fee-structure-section">
            <h2>💰 Fee Structure Analysis</h2>
            <div className="fee-structure-grid">
              {Object.entries(comparisonTables.fee_structure_analysis)
                .sort((a, b) => {
                  if (a[0] === "ING Self Invest") return -1;
                  if (b[0] === "ING Self Invest") return 1;
                  return 0;
                })
                .map(([broker, analysis]: [string, any]) => (
                <div key={broker} className="fee-structure-card">
                  <div className="fee-card-header">
                    <h3>{mapBrokerName(broker)}</h3>
                    <span className="fee-type-badge">{analysis.fee_type}</span>
                  </div>

                  <div className="fee-card-content">
                    {analysis.custody_fees && (
                      <div className="fee-detail">
                        <strong>Custody Fees:</strong>
                        <p>{analysis.custody_fees}</p>
                      </div>
                    )}

                    {analysis.markets && Object.entries(analysis.markets).map(([market, details]: [string, any]) => (
                      <div key={market} className="market-section">
                        <h4>{market}</h4>
                        <div className="market-details">
                          {details.description && (
                            <p className="market-description">{details.description}</p>
                          )}
                          {details.example_fee && (
                            <p className="market-example"><strong>Example Fee:</strong> {details.example_fee}</p>
                          )}
                          {details.key_features && (
                            <p className="market-features"><strong>Key Features:</strong> {details.key_features}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {analysis.special_notes && (
                      <div className="special-notes">
                        <p><em>💡 {analysis.special_notes}</em></p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        </>
      )}

      {comparisonTables && activeTab === "analysis" && renderFinancialAnalysis()}

      {isLoading && !comparisonTables && (
        <section className="panel placeholder">⏳ Loading broker comparison data...</section>
      )}

      {!isLoading && !comparisonTables && !error && (
        <section className="panel placeholder">
          🔍 No pricing data available.
        </section>
      )}

      {/* Control Panel - Bottom */}
      <section className="panel control-panel">
        <div className="control-left"></div>

        <div className="control-right">
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
