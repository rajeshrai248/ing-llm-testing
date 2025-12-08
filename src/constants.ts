// Dynamically determine API base URL based on environment or current hostname
const getApiBaseUrl = (): string => {
  // Check environment variables first (for .env configuration)
  const envHost = import.meta.env.VITE_API_HOST;
  const envPort = import.meta.env.VITE_API_PORT || 8000;
  const envProtocol = import.meta.env.VITE_API_PROTOCOL || 'http';

  // If host is explicitly configured in .env, use it
  if (envHost) {
    return `${envProtocol}://${envHost}:${envPort}`;
  }

  // Otherwise, auto-detect based on current hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Use port 8000 for the backend API
  return `${protocol}//${hostname}:${envPort}`;
};

const API_BASE_URL = getApiBaseUrl();

export const ANALYSIS_CACHE_KEY = "analysisCache";
export const COST_COMPARISON_ENDPOINT = `${API_BASE_URL}/cost-comparison-tables`;
export const FINANCIAL_ANALYSIS_ENDPOINT = `${API_BASE_URL}/financial-analysis`;
export const REFRESH_ENDPOINT = `${API_BASE_URL}/refresh-and-analyze`;
export const NEWS_ENDPOINT = `${API_BASE_URL}/news/scrape`;
export const STORAGE_KEY = "brokerData";

// Log the API base URL in development
if (import.meta.env.DEV) {
  console.log("API Base URL:", API_BASE_URL);
}
