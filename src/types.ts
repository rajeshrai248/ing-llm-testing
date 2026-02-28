export interface CustodyFee {
  type: string;
  value: number | null;
  currency: string;
  frequency: string;
  notes: string;
}

export interface StructuredFormula {
  base: number | null;
  percent: number | null;
  min: number | null;
  max: number | null;
}

export interface PricingTier {
  from: number | null;
  to: number | null;
  fee: number | null;
  currency: string;
}

export interface TransactionFee {
  instrument_type: string;
  market: string;
  pricing_type: string;
  formula_human: string;
  formula_structured: StructuredFormula | null;
  tiers: PricingTier[] | null;
  notes: string;
}

export interface FxFee {
  type: string;
  value: number | null;
  notes: string;
}

export interface OtherFee {
  name: string;
  type: string;
  value: number | null;
  currency: string;
  frequency: string;
  notes: string;
}

export interface BrokerApiResponse {
  broker_name: string;
  country: string;
  source_url: string;
  source_type: string;
  source_last_checked: string;
  account_type: string;
  pricing_model: {
    custody_fee: CustodyFee | null;
    transaction_fees: TransactionFee[] | null;
    fx_fees: FxFee | null;
    other_fees: OtherFee[] | null;
  };
}

export interface FlattenedPricingRow {
  id: string;
  broker: string;
  instrumentType: string;
  market: string;
  pricingType: string;
  baseFee: number | null;
  percentFee: number | null;
  minFee: number | null;
  maxFee: number | null;
  custodyFeeType: string;
  custodyFeeValue: number | null;
  custodyFrequency: string;
  fxFeeType: string;
  fxFeeValue: number | null;
  otherFeesSummary: string;
  exampleFee1000: number | null;
  exampleFee5000: number | null;
  exampleFee10000: number | null;
  sourceUrl: string;
}

/* New response format types for broker fee responses */
export interface FeeTier {
  volume_or_condition: string;
  fee_structure: string;
  notes?: string;
}

export interface FeeCategory {
  category: string;
  description: string;
  tiers: FeeTier[];
}

export interface SpecialFee {
  description: string;
  amount: string;
  when_applied: string;
}

export interface DepositWithdrawal {
  method: string;
  fee: string;
  timing: string;
}

export interface FeesByInstrument {
  instrument: string;
  online: string;
  phone: string;
  notes?: string;
}

export interface NewBrokerResponseFormat {
  broker_name: string;
  summary?: string;
  fee_categories?: FeeCategory[];
  special_fees?: SpecialFee[];
  deposit_withdrawal?: DepositWithdrawal[];
  inactivity_fees?: string;
  account_opening_fee?: string;
  account_closure_fee?: string;
  custody_charges?: string;
  minimum_deposit?: string;
  minimum_balance?: string;
  supported_instruments?: string[];
  order_channels?: string[];
  fees_by_instrument?: FeesByInstrument[];
  promotions_discounts?: string;
  key_observations?: string[];
  missing_data?: string[];
  error?: string;
}

export interface BrokerRow {
  broker: string;
  [key: string]: string | number | null | Record<string, any>;
}

export interface PersonaTradingDetail {
  instrument: string;
  amount: number;
  count_per_year: number;
  fee_per_trade: number;
  total: number;
}

export interface PersonaBrokerResult {
  broker: string;
  trading_costs: number;
  custody_cost_annual: number;
  connectivity_cost_annual: number;
  subscription_cost_annual: number;
  fx_cost_annual: number;
  dividend_cost_annual: number;
  total_annual_tco: number;
  rank: number;
  trading_cost_details: PersonaTradingDetail[];
}

export interface PersonaDefinition {
  name: string;
  description: string;
  portfolio_value: number;
  exchanges_used: number;
  fx_volume_annual: number;
  dividend_income_annual: number;
  trades: Array<{ instrument: string; amount: number; count_per_year: number }>;
}

export interface ComparisonTables {
  etfs: BrokerRow[];
  stocks: BrokerRow[];
  bonds: BrokerRow[];
  notes?: Record<string, string>;
  calculation_logic?: Record<string, Record<string, Record<string, string>>>;
  fee_structure_analysis?: Record<string, any>;
  investor_personas?: Record<string, PersonaBrokerResult[]>;
  persona_definitions?: Record<string, PersonaDefinition>;
}

export interface CostComparisonResponse {
  euronext_brussels?: {
    stocks: BrokerRow[];
    etfs: BrokerRow[];
    bonds?: BrokerRow[];
    calculation_logic?: Record<string, Record<string, Record<string, string>>>;
    notes?: Record<string, string>;
  };
  [key: string]: any;
}

export type BrokerResponseInput = BrokerApiResponse | NewBrokerResponseFormat;

/* Financial Analysis Types */
export interface AnalysisMetadata {
  title: string;
  subtitle: string;
  publishDate: string;
  readingTimeMinutes: number;
}

export interface ExecutiveSummaryPoint {
  text: string;
}

export interface AnalysisSection {
  id: string;
  title: string;
  icon: string;
  content: any[]; // Flexible content array for different types
}

export interface BrokerComparison {
  broker: string;
  badges?: string[];
  ratings?: {
    overall: number;
    fees: number;
    platform: number;
  };
  verdict?: string;
  uniqueSellingPoint?: string;
  hidden_costs_note?: string;
  overallRating?: number;
  etfRating?: number;
  stockRating?: number;
  bondRating?: number;
  rating?: number;
  pros?: string[];
  cons?: string[];
  bestFor?: string[];
  [key: string]: any;
}

export interface Scenario {
  name: string;
  winner: string;
  costs: Array<{
    broker: string;
    annual: number;
  }>;
}

export interface FinancialAnalysis {
  metadata: AnalysisMetadata;
  executiveSummary: {
    headline?: string;
    points: string[];
  } | string[];
  market_analysis?: {
    title: string;
    author: string;
    content_paragraphs: string[];
  };
  cheapest_per_scenario?: Record<string, Record<string, { winner: string; cost: number }>>;
  cheapestPerTier?: CheapestPerTier;
  sections?: AnalysisSection[];
  brokerComparisons?: BrokerComparison[];
  annualCostSimulation?: Array<{
    broker: string;
    passiveInvestorCost: number;
    activeTraderCost: number;
  }>;
  scenarios?: Scenario[];
  investmentScenarios?: InvestmentScenario[];
  recommendations?: Recommendations;
  marketInsights?: MarketInsights;
  checklist?: DecisionChecklist;
  categoryWinners?: CategoryWinners;
  costComparison?: CostComparison;
  costEvidence?: CostEvidence;
  disclaimer?: string;
  generatedAt?: Date;
}

export interface CategoryWinners {
  etfs?: {
    winner: string;
    reason: string;
  };
  stocks?: {
    winner: string;
    reason: string;
  };
  bonds?: {
    winner: string;
    reason: string;
  };
  overall?: {
    winner: string;
    reason: string;
  };
}

export interface CostScenario {
  broker: string;
  annualCost: number;
  rank?: number;
}

export interface CostComparison {
  passiveInvestor?: CostScenario[];
  activeTrader?: CostScenario[];
  monthly500ETF?: Array<{
    broker: string;
    annualCost: number;
  }>;
}

export interface CostEvidence {
  passiveInvestor?: Record<string, string>;
  activeTrader?: Record<string, string>;
}

export interface CheapestPerTier {
  stocks?: Record<string, string>;
  etfs?: Record<string, string>;
  bonds?: Record<string, string>;
}

export interface InvestmentScenario {
  id: string;
  icon: string;
  title: string;
  profile: string;
  annualCosts: Array<{
    broker: string;
    cost: number;
    winner?: boolean;
  }>;
  recommendation: string;
  alternativeRecommendation: string;
}

export interface Recommendations {
  categoryWinners: Array<{
    category: string;
    winner: string;
    reasoning: string;
    bestFor: string[];
  }>;
  brokersToReconsider: Array<{
    broker: string;
    reason: string;
  }>;
}

export interface MarketInsights {
  trends2025: Array<{
    title: string;
    description: string;
  }>;
  outlook2026: string[];
}

export interface DecisionChecklist {
  investmentStyle: Array<{
    question: string;
    recommendation: string;
  }>;
  serviceRequirements: Array<{
    question: string;
    recommendation: string;
  }>;
  costSensitivity: string[];
}

export interface NewsItem {
  broker: string;
  title: string;
  summary: string;
  url: string;
  date: string | null;
  source: string;
}

export interface NewsResponse {
  status: string;
  message: string;
  news_by_broker: Record<string, number>;
  news_items: NewsItem[];
  total_scraped: number;
  brokers_with_news: number;
  brokers_processed: number;
  duration_seconds: number;
  warnings?: Record<string, string>;
}
