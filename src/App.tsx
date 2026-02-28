import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ANALYSIS_CACHE_KEY, NEWS_CACHE_KEY, COST_COMPARISON_ENDPOINT, FINANCIAL_ANALYSIS_ENDPOINT, REFRESH_ENDPOINT, STORAGE_KEY, NEWS_SCRAPE_ENDPOINT } from "./constants";
import { BrokerRow, ComparisonTables, FinancialAnalysis, NewsResponse, PersonaBrokerResult, PersonaDefinition } from "./types";
import { makeApiRequest } from "./api";
import NewsRoom from "./NewsRoom";
import ChatBot from "./ChatBot";

// Helper: Convert broker object to BrokerRow array
const convertBrokerObjectToArray = (brokerObj: Record<string, any>): BrokerRow[] => {
  if (!brokerObj || typeof brokerObj !== 'object') return [];

  return Object.entries(brokerObj).map(([brokerName, amounts]) => ({
    broker: brokerName,
    ...amounts
  }));
};

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
  const { t, i18n } = useTranslation();
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
  const [activeTab, setActiveTab] = useState<"tables" | "analysis" | "news">("tables");
  const [activePersona, setActivePersona] = useState<string>("");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Language-aware cache key for cost comparison data
  const storageKey = `${STORAGE_KEY}_${i18n.language}`;

  // Re-fetch data when language changes (cost tables have localized notes/personas, analysis is LLM-generated)
  const refetchLLMData = useCallback(async () => {
    console.log(`Re-fetching data for language: ${i18n.language}`);
    setIsAnalysisPreparing(true);
    try {
      const [costComparisonResponse, analysisResponse] = await Promise.all([
        makeApiRequest<ComparisonTables>(`${COST_COMPARISON_ENDPOINT}`, {
          method: 'GET',
          timeout: 120000
        }).catch(err => {
          console.warn("Cost comparison re-fetch failed:", err);
          return null;
        }),
        makeApiRequest<FinancialAnalysis>(
          `${FINANCIAL_ANALYSIS_ENDPOINT}?force=true`, {
            method: 'GET',
            timeout: 120000
          }
        ).catch(err => {
          console.warn("Financial analysis re-fetch failed:", err);
          return null;
        })
      ]);

      if (costComparisonResponse && 'euronext_brussels' in costComparisonResponse) {
        const exchangeData = costComparisonResponse.euronext_brussels;
        const processedData: ComparisonTables = {
          etfs: convertBrokerObjectToArray(exchangeData?.etfs),
          stocks: convertBrokerObjectToArray(exchangeData?.stocks),
          bonds: convertBrokerObjectToArray(exchangeData?.bonds),
          notes: exchangeData?.notes || {},
          calculation_logic: exchangeData?.calculation_logic || {},
          fee_structure_analysis: (costComparisonResponse as any).fee_structure_analysis || {},
          investor_personas: exchangeData?.investor_personas || {},
          persona_definitions: exchangeData?.persona_definitions || {},
        };
        setComparisonTables(processedData);
        localStorage.setItem(storageKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: processedData
        }));
      }

      if (analysisResponse) {
        setFinancialAnalysis(analysisResponse);
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify({
          timestamp: new Date().toISOString(),
          lang: i18n.language,
          data: analysisResponse
        }));
      }
    } catch (err) {
      console.warn("Language re-fetch failed:", err);
    } finally {
      setIsAnalysisPreparing(false);
    }
  }, [i18n.language]);

  // Update document lang attribute and re-fetch data when language changes
  const prevLangRef = useRef(i18n.language);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    // Re-fetch data when language changes (not on initial mount)
    if (prevLangRef.current !== i18n.language) {
      prevLangRef.current = i18n.language;
      console.log(`Language changed to ${i18n.language} - re-fetching data`);

      // Try to hydrate from language-specific cache first
      const cachedKey = `${STORAGE_KEY}_${i18n.language}`;
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setComparisonTables(parsed.data);
          console.log(`Hydrated ${i18n.language} data from cache`);
        } catch (e) {
          console.warn("Failed to parse cached data:", e);
        }
      }

      // Fetch fresh data (will update state when complete)
      refetchLLMData();
    }
  }, [i18n.language, refetchLLMData]);

  const currentLocale = i18n.language === 'fr-be' ? 'fr-BE' : i18n.language === 'nl-be' ? 'nl-BE' : 'en-GB';

  const hydrateFromCache = async () => {
    try {
      const serialized = localStorage.getItem(storageKey);
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

      // Restore cached news if available
      const newsSerialized = localStorage.getItem(NEWS_CACHE_KEY);
      if (newsSerialized) {
        const cachedNews = JSON.parse(newsSerialized) as NewsResponse;
        setNewsData(cachedNews);
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

    // If force refresh, clear cache to prevent stale data from being shown
    if (force) {
      console.log('Force refresh - clearing cache');
      localStorage.removeItem(storageKey);
      localStorage.removeItem(ANALYSIS_CACHE_KEY);
      localStorage.removeItem(NEWS_CACHE_KEY);
    }

    try {
      // Fetch cost comparison tables, news, and financial analysis in parallel
      const [costComparisonResponse, newsResponse, analysisResponse] = await Promise.all([
        makeApiRequest<ComparisonTables>(`${COST_COMPARISON_ENDPOINT}`, {
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
        makeApiRequest<FinancialAnalysis>(`${FINANCIAL_ANALYSIS_ENDPOINT}`, {
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
            etfs: convertBrokerObjectToArray(exchangeData?.etfs),
            stocks: convertBrokerObjectToArray(exchangeData?.stocks),
            bonds: convertBrokerObjectToArray(exchangeData?.bonds),
            notes: exchangeData?.notes || {},
            calculation_logic: exchangeData?.calculation_logic || {},
            fee_structure_analysis: (costComparisonResponse as any).fee_structure_analysis || {},
            investor_personas: exchangeData?.investor_personas || {},
            persona_definitions: exchangeData?.persona_definitions || {},
          };
        } else {
          // Fallback to old format
          processedData = {
            etfs: convertBrokerObjectToArray(costComparisonResponse.etfs),
            stocks: convertBrokerObjectToArray(costComparisonResponse.stocks),
            bonds: convertBrokerObjectToArray(costComparisonResponse.bonds),
            notes: costComparisonResponse.notes || {},
            calculation_logic: (costComparisonResponse as any).calculation_logic || {},
            fee_structure_analysis: (costComparisonResponse as any).fee_structure_analysis || {},
            investor_personas: (costComparisonResponse as any).investor_personas || {},
            persona_definitions: (costComparisonResponse as any).persona_definitions || {},
          };
        }

        setComparisonTables(processedData);
        setLastUpdated(new Date());
        localStorage.setItem(storageKey, JSON.stringify({
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
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newsResponse));
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
      // Always fetch fresh data on page reload - discard cache
      console.log('Page loaded - fetching fresh data');
      fetchComparisonTables(false);
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
        console.log('F5 pressed - fetching fresh data with refresh');
        fetchComparisonTables(true, true);  // true, true = manual refresh with force
      }
      // Ctrl+R (Windows/Linux) or Cmd+R (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        console.log('Ctrl+R/Cmd+R pressed - fetching fresh data with refresh');
        fetchComparisonTables(true, true);  // true, true = manual refresh with force
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);



  const renderComparisonTable = (rows: BrokerRow[], title: string, instrumentType: 'etfs' | 'stocks' | 'bonds' = 'etfs') => {
    if (!rows || rows.length === 0) return null;

    // Filter out Revolut for bonds section
    let filteredByBroker = rows;
    if (instrumentType === 'bonds') {
      filteredByBroker = rows.filter(row => row.broker !== 'Revolut');
    }

    // Safety check: ensure we have rows and can access the first one
    if (!filteredByBroker || filteredByBroker.length === 0) return null;

    const amounts = Object.keys(filteredByBroker[0])
      .filter((k) => k !== "broker")
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Filter out rows where all values are null (broker doesn't offer this instrument)
    // A value of 0 is valid (means free) - only null means unavailable
    const filteredRows = filteredByBroker.filter((row) => {
      return amounts.some((amount) => {
        const value = row[amount];
        if (value === null || value === undefined) return false;
        if (typeof value === 'object' && value !== null && 'total_cost' in value) {
          return true; // Has structured data, keep it
        }
        if (typeof value === 'object') return false;
        return true; // Keep any non-null value including 0
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

    // Compute cheapest (minimum) cost per amount column across all non-null rows
    const cheapestPerAmount: Record<string, number> = {};
    amounts.forEach((amount) => {
      let min = Infinity;
      sortedRows.forEach((row) => {
        const value = row[amount];
        if (value !== null && value !== undefined) {
          const cost = getTotalCost(value);
          if (cost < min) min = cost;
        }
      });
      if (min !== Infinity) cheapestPerAmount[amount] = min;
    });

    // Helper to extract handling fee from value
    const getHandlingFee = (value: any): number => {
      if (typeof value === 'object' && 'handling_fee' in value) {
        return parseFeeAmount(value.handling_fee);
      }
      return 0;
    };

    return (
      <div className="table-container">
        <div className="table-header-wrapper">
          <div className="table-header-title-group">
            <h3 className="table-title">{title}</h3>
            {instrumentType !== 'bonds' && (
              <p className="table-subtitle">{t('table.transactionFeesSubtitle')}</p>
            )}
          </div>
          <div className="table-info-icon" title={t('table.howToRead')}>
            <span className="info-icon-button">
              <span className="info-icon-text">ℹ</span>
            </span>
            <div className="info-tooltip">
              <strong>{t('table.howToReadTitle')}</strong>
              <p>{t('table.howToReadDescription')}</p>
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="broker-col">{t('table.broker')}</th>
                {amounts.map((amount) => (
                  <th
                    key={amount}
                    className="amount-col"
                    title={t('table.amountTooltip', { amount })}
                  >
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
                    const isCheapest = !isNull && cheapestPerAmount[amount] !== undefined && totalCost === cheapestPerAmount[amount];

                    return (
                      <td key={amount} className="amount-col">
                        {isNull ? (
                          <span className="fee-badge fee-unavailable">{t('table.na')}</span>
                        ) : (
                          <div className="fee-with-tooltip">
                            <span className={`fee-badge${isCheapest ? ' fee-cheapest' : ''}`} title={calculation || t('table.noDetails')}>
                              €{totalCost.toFixed(2)}
                            </span>
                            {handlingFee > 0 && (
                              <span className="handling-fee-badge" title={t('table.handlingFee')}>
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

  const renderInvestorPersonas = () => {
    const personas = comparisonTables?.investor_personas;
    const definitions = comparisonTables?.persona_definitions;
    if (!personas || Object.keys(personas).length === 0) return null;

    const personaKeys = Object.keys(personas);
    const currentPersona = activePersona || personaKeys[0];
    const currentDefinition = definitions?.[currentPersona];
    const currentBrokers = personas[currentPersona] || [];

    // Sort: rank order, but keep ING Self Invest visible
    const sortedBrokers = [...currentBrokers].sort((a, b) => a.rank - b.rank);

    const personaIcons: Record<string, string> = {
      passive_investor: "🎯",
      moderate_investor: "⚖️",
      active_trader: "⚡",
    };

    const formatCurrency = (value: number): string => {
      return `€${value.toFixed(2)}`;
    };

    return (
      <section className="persona-section">
        <h2 className="persona-section-title">👤 {t('personas.title')}</h2>
        <p className="persona-section-subtitle">{t('personas.subtitle')}</p>

        {/* Persona Tabs */}
        <div className="persona-tabs">
          {personaKeys.map((key) => {
            const def = definitions?.[key];
            return (
              <button
                key={key}
                className={`persona-tab ${currentPersona === key ? 'active' : ''}`}
                onClick={() => setActivePersona(key)}
              >
                <span className="persona-tab-icon">{personaIcons[key] || "👤"}</span>
                <span className="persona-tab-name">{def?.name || key.replace(/_/g, ' ')}</span>
              </button>
            );
          })}
        </div>

        {/* Persona Profile Card */}
        {currentDefinition && (
          <div className="persona-profile">
            <div className="persona-profile-header">
              <span className="persona-profile-icon">{personaIcons[currentPersona] || "👤"}</span>
              <div>
                <h3 className="persona-profile-name">{currentDefinition.name}</h3>
                <p className="persona-profile-desc">{currentDefinition.description}</p>
              </div>
            </div>
            <div className="persona-profile-stats">
              <div className="persona-stat">
                <span className="persona-stat-label">{t('personas.portfolioValue')}</span>
                <span className="persona-stat-value">{formatCurrency(currentDefinition.portfolio_value)}</span>
              </div>
              {currentDefinition.trades.map((trade, idx) => (
                <div key={idx} className="persona-stat">
                  <span className="persona-stat-label">
                    {trade.instrument.charAt(0).toUpperCase() + trade.instrument.slice(1)}
                  </span>
                  <span className="persona-stat-value">
                    {trade.count_per_year}x {formatCurrency(trade.amount)}/{t('personas.year')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TCO Comparison Table */}
        <div className="persona-table-container">
          <div className="table-responsive">
            <table className="persona-table">
              <thead>
                <tr>
                  <th className="persona-rank-col">{t('personas.rank')}</th>
                  <th className="persona-broker-col">{t('table.broker')}</th>
                  <th>{t('personas.tradingCosts')}</th>
                  <th>{t('personas.custody')}</th>
                  <th>{t('personas.connectivity')}</th>
                  <th>{t('personas.fx')}</th>
                  <th>{t('personas.dividends')}</th>
                  <th className="persona-tco-col">{t('personas.totalTCO')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedBrokers.map((broker, idx) => (
                  <tr
                    key={broker.broker}
                    className={`${broker.rank === 1 ? 'persona-winner' : ''} ${idx % 2 === 0 ? 'row-even' : 'row-odd'}`}
                  >
                    <td className="persona-rank-col">
                      {broker.rank === 1 ? (
                        <span className="persona-rank-badge rank-gold">🏆 {broker.rank}</span>
                      ) : broker.rank === 2 ? (
                        <span className="persona-rank-badge rank-silver">🥈 {broker.rank}</span>
                      ) : broker.rank === 3 ? (
                        <span className="persona-rank-badge rank-bronze">🥉 {broker.rank}</span>
                      ) : (
                        <span className="persona-rank-badge">{broker.rank}</span>
                      )}
                    </td>
                    <td className="persona-broker-col broker-name">
                      <strong>{mapBrokerName(broker.broker)}</strong>
                    </td>
                    <td>
                      <span className="fee-badge">{formatCurrency(broker.trading_costs)}</span>
                    </td>
                    <td>
                      <span className="fee-badge">{formatCurrency(broker.custody_cost_annual)}</span>
                    </td>
                    <td>
                      <span className="fee-badge">{formatCurrency(broker.connectivity_cost_annual)}</span>
                    </td>
                    <td>
                      <span className="fee-badge">{formatCurrency(broker.fx_cost_annual)}</span>
                    </td>
                    <td>
                      <span className="fee-badge">{formatCurrency(broker.dividend_cost_annual)}</span>
                    </td>
                    <td className="persona-tco-col">
                      <span className={`persona-tco-value ${broker.rank === 1 ? 'tco-winner' : ''}`}>
                        {formatCurrency(broker.total_annual_tco)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trading Cost Details (expandable) */}
        {sortedBrokers.length > 0 && sortedBrokers[0].trading_cost_details && sortedBrokers[0].trading_cost_details.length > 0 && (
          <div className="tco-breakdown">
            <h4 className="tco-breakdown-title">{t('personas.costBreakdown')}</h4>
            <div className="tco-breakdown-grid">
              {sortedBrokers.filter(b => b.rank <= 3).map((broker) => (
                <div key={broker.broker} className={`tco-breakdown-card ${broker.rank === 1 ? 'tco-card-winner' : ''}`}>
                  <div className="tco-breakdown-header">
                    <strong>{mapBrokerName(broker.broker)}</strong>
                    <span className="tco-breakdown-total">{formatCurrency(broker.total_annual_tco)}/{t('personas.year')}</span>
                  </div>
                  <div className="tco-breakdown-details">
                    {broker.trading_cost_details.map((detail, idx) => (
                      <div key={idx} className="tco-detail-row">
                        <span className="tco-detail-instrument">
                          {detail.instrument.charAt(0).toUpperCase() + detail.instrument.slice(1)}
                        </span>
                        <span className="tco-detail-info">
                          {detail.count_per_year}x {formatCurrency(detail.amount)} @ {formatCurrency(detail.fee_per_trade)}
                        </span>
                        <span className="tco-detail-total">{formatCurrency(detail.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderFinancialAnalysis = () => {
    if (isAnalysisPreparing) {
      return (
        <div className="analysis-container">
          <div className="analysis-loading">
            <h2>📊 {t('analysis.title')}</h2>
            <div className="preparing-message">
              <p>⏳ {t('analysis.preparing')}</p>
              <p className="preparing-subtitle">{t('analysis.preparingSubtitle')}</p>
              <div className="skeleton-bars">
                <div className="skeleton-bar skeleton-bar-wide"></div>
                <div className="skeleton-bar skeleton-bar-medium"></div>
                <div className="skeleton-bar skeleton-bar-narrow"></div>
              </div>
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
            <h2>📊 {t('analysis.title')}</h2>
            <p>⚠️ {t('analysis.incomplete')}</p>
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
              <h1 className="analysis-main-title">{financialAnalysis.metadata.title || t('analysis.brokerCompAnalysis')}</h1>
              <h2 className="analysis-vs-title">{financialAnalysis.metadata.subtitle || t('analysis.howBrokersCompare')}</h2>
            </div>
            <p className="analysis-subtitle">{financialAnalysis.metadata.subtitle || t('analysis.detailedComparison')}</p>
            <div className="analysis-meta">
              <span className="meta-item">📅 {financialAnalysis.metadata.publishDate || new Date().toLocaleDateString(currentLocale)}</span>
              <span className="meta-item">⏱️ {t('analysis.minRead', { count: financialAnalysis.metadata.readingTimeMinutes || 5 })}</span>
            </div>
          </div>

          {/* Executive Summary */}
          <section className="analysis-section executive-summary">
            <h2>
              💡{' '}
              {typeof financialAnalysis.executiveSummary === 'object' && financialAnalysis.executiveSummary !== null && 'headline' in financialAnalysis.executiveSummary
                ? (financialAnalysis.executiveSummary as any).headline
                : t('analysis.executiveSummary')}
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
              <h2>🎯 {t('analysis.keyTakeaways')}</h2>
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
              <h2>📈 {t('analysis.marketAnalysis')}</h2>
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
              <h2>🎯 {t('analysis.cheapestPerScenario')}</h2>
              <div className="cheapest-scenarios-wrapper">
                {Object.entries(financialAnalysis.cheapest_per_scenario).map(([instrumentType, amounts]) => (
                  <div key={instrumentType} className="cheapest-instrument">
                    <h3>{instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)}</h3>
                    <div className="cheapest-table">
                      <div className="cheapest-header">
                        <span className="col-amount">{t('analysis.amount')}</span>
                        <span className="col-winner">{t('analysis.cheapestBroker')}</span>
                        <span className="col-cost">{t('analysis.annualCost')}</span>
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
              <h2>💰 {t('analysis.cheapestPerTier')}</h2>
              <div className="tier-wrapper">
                {financialAnalysis.cheapestPerTier.stocks && Object.keys(financialAnalysis.cheapestPerTier.stocks).length > 0 && (
                  <div className="tier-section">
                    <h3>📉 {t('analysis.stocks')}</h3>
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
                    <h3>📈 {t('analysis.etfs')}</h3>
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
                    <h3>💳 {t('analysis.bonds')}</h3>
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
              <h2>📊 {t('analysis.annualCostSim')}</h2>
              <p className="simulation-description">{t('analysis.costForInvestorTypes')}</p>
              <div className="simulation-table-wrapper">
                <table className="simulation-table">
                  <thead>
                    <tr>
                      <th>{t('analysis.broker')}</th>
                      <th className="passive-col">{t('analysis.passiveInvestor')} <span className="trades-label">({t('analysis.tradesPerMonth', { count: 12 })})</span></th>
                      <th className="active-col">{t('analysis.activeTrader')} <span className="trades-label">({t('analysis.tradesPerMonth', { count: 120 })})</span></th>
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
            <h2>🏆 {t('analysis.brokerComparisons')}</h2>
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
                        <span className="category">{t('analysis.overall')}:</span>
                        <div className="rating-bar-wrapper">
                          <div className="rating-bar-container">
                            <div className="rating-bar-fill" style={{ width: `${((broker.ratings.overall || 0) / 5) * 100}%` }}></div>
                          </div>
                          <span className="rating-label">{broker.ratings.overall || 0}/5</span>
                        </div>
                      </div>
                      <div className="rating-row">
                        <span className="category">{t('analysis.fees')}:</span>
                        <div className="rating-bar-wrapper">
                          <div className="rating-bar-container">
                            <div className="rating-bar-fill" style={{ width: `${((broker.ratings.fees || 0) / 5) * 100}%` }}></div>
                          </div>
                          <span className="rating-label">{broker.ratings.fees || 0}/5</span>
                        </div>
                      </div>
                      <div className="rating-row">
                        <span className="category">{t('analysis.platform')}:</span>
                        <div className="rating-bar-wrapper">
                          <div className="rating-bar-container">
                            <div className="rating-bar-fill" style={{ width: `${((broker.ratings.platform || 0) / 5) * 100}%` }}></div>
                          </div>
                          <span className="rating-label">{broker.ratings.platform || 0}/5</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {broker.verdict && (
                    <p className="broker-verdict"><em>{broker.verdict}</em></p>
                  )}

                  <div className="pros-cons">
                    {broker.pros && (
                      <div className="pros">
                        <strong>✓ {t('analysis.pros')}</strong>
                        <ul>
                          {broker.pros.map((pro: string, idx: number) => <li key={idx}>{pro}</li>)}
                        </ul>
                      </div>
                    )}
                    {broker.cons && (
                      <div className="cons">
                        <strong>✗ {t('analysis.cons')}</strong>
                        <ul>
                          {broker.cons.map((con: string, idx: number) => <li key={idx}>{con}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {broker.uniqueSellingPoint && (
                    <div className="unique-selling-point">
                      <strong>💡 {t('analysis.usp')}:</strong>
                      <p>{broker.uniqueSellingPoint}</p>
                    </div>
                  )}

                  {broker.hidden_costs_note && (
                    <div className="hidden-costs-note">
                      <strong>⚠️ {t('analysis.hiddenCosts')}:</strong>
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
              <h2>✨ {t('analysis.categoryWinners')}</h2>
              <div className="winners-list">
                <div className="winner-card">
                  <h3>{t('analysis.bestForEtfs')}</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.etfs?.winner || t('table.na')}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.etfs?.reason || ''}</p>
                </div>
                <div className="winner-card">
                  <h3>{t('analysis.bestForStocks')}</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.stocks?.winner || t('table.na')}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.stocks?.reason || ''}</p>
                </div>
                <div className="winner-card">
                  <h3>{t('analysis.bestForBonds')}</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.bonds?.winner || t('table.na')}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.bonds?.reason || ''}</p>
                </div>
                <div className="winner-card">
                  <h3>{t('analysis.bestForOverall')}</h3>
                  <p className="winner-name">{financialAnalysis.categoryWinners.overall?.winner || t('table.na')}</p>
                  <p className="winner-reason">{financialAnalysis.categoryWinners.overall?.reason || ''}</p>
                </div>
              </div>
            </section>
          )}

          {/* Cost Comparison Scenarios */}
          {financialAnalysis.costComparison && (
            <section className="analysis-section investment-scenarios">
              <h2>💰 {t('analysis.costScenarios')}</h2>
              <div className="scenarios-grid">
                {/* Passive Investor */}
                {financialAnalysis.costComparison.passiveInvestor && (
                  <div className="scenario-card">
                    <h3>🎯 {t('analysis.passiveInvestor')}</h3>
                    <p className="scenario-profile">{t('analysis.passiveProfile')}</p>
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
                    <h3>⚡ {t('analysis.activeTrader')}</h3>
                    <p className="scenario-profile">{t('analysis.activeProfile')}</p>
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
                    <h3>🎯 {t('analysis.monthly500ETF')}</h3>
                    <p className="scenario-profile">{t('analysis.investing500Monthly')}</p>
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
                    <h3>⚡ {t('analysis.activeTrader')}</h3>
                    <p className="scenario-profile">{t('analysis.activeTraderProfile')}</p>
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
              ⚠️ <strong>{t('analysis.disclaimer')}:</strong> {financialAnalysis.disclaimer || t('analysis.disclaimerDefault')}
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
              <span className="breaking-text">{t('news.marketNews')}</span>
            </div>
            <div className="ticker-stats">
              <span>{t('news.noNewsAvailable')}</span>
            </div>
          </div>

          {/* Empty Ticker */}
          <div className="ticker-wrapper ticker-empty">
            <div className="ticker-content ticker-empty-content">
              <div className="ticker-item">
                <div className="ticker-ribbon">
                  <span className="ribbon-broker">NEWS</span>
                </div>
                <span className="empty-message">{t('news.emptyMessage')}</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="ticker-footer">
            <p>{t('news.autoScraped')}</p>
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
            <span className="breaking-text">{t('news.marketNews')}</span>
          </div>
          <div className="ticker-filters">
            <label className="filter-label">{t('news.filterByBroker')}</label>
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
            <span>{t('news.articlesShown', { count: sortedNews.length })}</span>
          </div>
        </div>

        {sortedNews.length === 0 ? (
          <div className="ticker-wrapper ticker-empty">
            <div className="ticker-content ticker-empty-content">
              <div className="ticker-item">
                <div className="ticker-ribbon">
                  <span className="ribbon-broker">FILTER</span>
                </div>
                <span className="empty-message">{t('news.noMatch')}</span>
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
              <p>{t('news.clickToRead')}</p>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <main className="page">
      {/* Header with Improved Look and Feel */}
      <header className="page-header-improved">
        <div className="header-content">
          <div className="header-top-row">
            <p className="header-eyebrow">{t('header.eyebrow')}</p>
            <div className="language-switcher">
              <button
                className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => changeLanguage('en')}
              >
                EN
              </button>
              <button
                className={`lang-btn ${i18n.language === 'fr-be' ? 'active' : ''}`}
                onClick={() => changeLanguage('fr-be')}
              >
                FR
              </button>
              <button
                className={`lang-btn ${i18n.language === 'nl-be' ? 'active' : ''}`}
                onClick={() => changeLanguage('nl-be')}
              >
                NL
              </button>
            </div>
          </div>
          <h1 className="header-title">{t('header.title')}</h1>
          <p className="header-description">
            {t('header.description')}
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <section className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "tables" ? "active" : ""}`}
          onClick={() => setActiveTab("tables")}
          disabled={!comparisonTables}
        >
          📊 {t('tabs.comparison')}
        </button>
        <button
          className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`}
          onClick={() => setActiveTab("analysis")}
          disabled={!comparisonTables}
        >
          💡 {t('tabs.analysis')}
        </button>
        <button
          className={`tab-btn ${activeTab === "news" ? "active" : ""}`}
          onClick={() => setActiveTab("news")}
          disabled={!newsData}
        >
          📰 {t('tabs.news')}
        </button>
      </section>

      {/* Content */}
      {comparisonTables && activeTab === "tables" && (
        <>
          <section className="tables-section">
            {comparisonTables.etfs && renderComparisonTable(comparisonTables.etfs, `📈 ${t('table.etfsTitle')}`, "etfs")}
            {comparisonTables.stocks && renderComparisonTable(comparisonTables.stocks, `📉 ${t('table.stocksTitle')}`, "stocks")}

            {comparisonTables.investor_personas && Object.keys(comparisonTables.investor_personas).length > 0 &&
              renderInvestorPersonas()}

            {comparisonTables.notes && Object.keys(comparisonTables.notes).length > 0 && (
              <section className="notes-section">
                <h2>📋 {t('notes.title')}</h2>
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
              <h2>💰 {t('feeStructure.title')}</h2>
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
                            <strong>{t('feeStructure.custodyFees')}:</strong>
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
                                <p className="market-example"><strong>{t('feeStructure.exampleFee')}:</strong> {details.example_fee}</p>
                              )}
                              {details.key_features && (
                                <p className="market-features"><strong>{t('feeStructure.keyFeatures')}:</strong> {details.key_features}</p>
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

      {activeTab === "news" && newsData && (
        <NewsRoom newsItems={newsData.news_items || []} />
      )}

      {isLoading && !comparisonTables && (
        <section className="panel placeholder">⏳ {t('loading.brokerData')}</section>
      )}

      {!isLoading && !comparisonTables && !error && (
        <section className="panel placeholder">
          🔍 {t('empty.noPricing')}
        </section>
      )}

      {/* Control Panel - Bottom */}
      <section className="panel control-panel">
        <div className="control-left"></div>

        <div className="control-right">
        </div>

        <div className="status-info">
          {isLoading && !comparisonTables && <span>⏳ {t('loading.costTables')}</span>}
          {isRefreshing && comparisonTables && <span>🔄 {t('loading.updating')}</span>}
          {lastUpdated && !isLoading && !isRefreshing && (
            <span>
              ✓ {t('loading.lastUpdated')}{" "}
              {lastUpdated.toLocaleTimeString(currentLocale, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>

      {/* ChatBot Popup */}
      <ChatBot />
    </main>
  );
}

export default App;
