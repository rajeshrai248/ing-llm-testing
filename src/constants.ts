// Dynamically determine API base URL based on environment or current hostname
const getApiBaseUrl = (): string => {
  // Check environment variables first (for .env configuration)
  const envHost = import.meta.env.VITE_API_HOST;
  
  // If host is explicitly configured in .env, use it
  if (envHost) {
    const envPort = import.meta.env.VITE_API_PORT || 8000;
    const envProtocol = import.meta.env.VITE_API_PROTOCOL || 'http';
    return `${envProtocol}://${envHost}:${envPort}`;
  }

  // For deployed environments, use relative paths (nginx will proxy them)
  // This avoids CORS issues and loopback access restrictions
  const hostname = window.location.hostname;
  
  // If deployed to public domain, use relative paths for nginx proxy
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return '';
  }
  
  // For local development, use localhost:8000
  const protocol = window.location.protocol;
  return `${protocol}//localhost:8000`;
};

const API_BASE_URL = getApiBaseUrl();
const API_PATH = '/api';

export const ANALYSIS_CACHE_KEY = "analysisCache";
export const NEWS_CACHE_KEY = "newsCache";
export const HEALTH_ENDPOINT = `${API_BASE_URL}${API_PATH}/health`;
export const BROKERS_ENDPOINT = `${API_BASE_URL}${API_PATH}/brokers`;
export const BROKER_FEES_ENDPOINT = (brokerName: string) => `${API_BASE_URL}${API_PATH}/brokers/${encodeURIComponent(brokerName)}/fees`;
// Removed: /compare endpoint replaced by /cost-comparison-tables
export const CHEAPEST_ENDPOINT = (amount: number) => `${API_BASE_URL}${API_PATH}/cheapest/${amount}`;
export const EXTRACT_ENDPOINT = `${API_BASE_URL}${API_PATH}/extract`;
export const VALIDATE_ENDPOINT = `${API_BASE_URL}${API_PATH}/validate`;
export const REPORTS_ENDPOINT = `${API_BASE_URL}${API_PATH}/reports`;

// News endpoints
export const NEWS_SCRAPE_ENDPOINT = `${API_BASE_URL}/news/scrape`;
export const NEWS_ENDPOINT = `${API_BASE_URL}${API_PATH}/news`;
export const NEWS_BROKER_ENDPOINT = (brokerName: string) => `${API_BASE_URL}${API_PATH}/news/broker/${encodeURIComponent(brokerName)}`;
export const NEWS_RECENT_ENDPOINT = `${API_BASE_URL}${API_PATH}/news/recent`;
export const NEWS_STATISTICS_ENDPOINT = `${API_BASE_URL}${API_PATH}/news/statistics`;

export const STORAGE_KEY = "brokerData";

// Chat endpoint
export const CHAT_ENDPOINT = `${API_BASE_URL}/chat`;

// Legacy endpoints - kept for backwards compatibility during migration
export const COST_COMPARISON_ENDPOINT = `${API_BASE_URL}/cost-comparison-tables`;
export const FINANCIAL_ANALYSIS_ENDPOINT = `${API_BASE_URL}/financial-analysis`;
export const REFRESH_ENDPOINT = `${API_BASE_URL}/refresh-and-analyze`;

// Log the API base URL in development
if (import.meta.env.DEV) {
  console.log("API Base URL:", API_BASE_URL);
}
