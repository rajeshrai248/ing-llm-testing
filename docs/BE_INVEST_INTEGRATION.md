# BE Invest API Integration Guide - ING LLM Testing

## 🎯 Overview

Your broker fee comparison application has been upgraded to integrate with the **BE Invest API** (`localhost:8000`). The app now features:

✅ **Real-time cost comparison tables** for ETFs, stocks, and bonds
✅ **AI-powered financial analysis** with investment insights
✅ **Dual LLM support** - Claude 3.5 Sonnet & GPT-4O
✅ **Professional financial blogger aesthetic** with modern UI
✅ **LocalStorage caching** for instant load times
✅ **Responsive design** optimized for all devices

---

## 🚀 Quick Start

### 1. Start the BE Invest API Server

```bash
# In the be-invest project directory
python scripts/run_api.py
```

The API will be available at `http://localhost:8000`

### 2. Run the Vite Dev Server

```bash
# In the ing-llm-testing directory
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Generate Broker Data (First Time Only)

```bash
# In the be-invest project directory
python scripts/generate_exhaustive_summary.py
```

---

## 🔌 API Integration Architecture

### Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cost-comparison-tables` | GET | Fetch price comparison tables for all instruments |
| `/refresh-and-analyze` | POST | Refresh PDF data and regenerate analysis |

### Query Parameters

**Cost Comparison Tables:**
```
GET /cost-comparison-tables?model=claude-3-5-sonnet-20241022
```

- `model` (optional): Choose between `gpt-4o` or `claude-3-5-sonnet-20241022`
- Default: `claude-3-5-sonnet-20241022` (Claude)

**Refresh & Analyze:**
```
POST /refresh-and-analyze?model=gpt-4o
```

- `model` (optional): LLM model to use for analysis
- Trigger with empty JSON body: `{}`

---

## 📊 App Architecture

### Component Structure

```
App.tsx
├── State Management
│   ├── comparisonTables (ComparisonTables)
│   ├── financialAnalysis (FinancialAnalysis)
│   ├── error, isLoading, isRefreshing
│   └── selectedModel, activeTab
│
├── Data Fetching
│   ├── hydrateFromCache() - Load from localStorage
│   ├── fetchComparisonTables() - GET /cost-comparison-tables
│   └── refreshData() - POST /refresh-and-analyze
│
├── Analysis Generation
│   ├── calculateAvgFee() - Compute averages
│   ├── generateFinancialAnalysis() - Create insights
│   └── parseFeeAmount() - Parse fee strings
│
└── Rendering
    ├── renderComparisonTable() - Price tables
    ├── renderFinancialAnalysis() - Analysis cards
    └── UI Components - Buttons, selectors, tabs
```

### Data Flow

```
User Opens App
    ↓
Check localStorage cache
    ↓
If cached & valid → Display immediately
    ↓
If no cache → Fetch /cost-comparison-tables
    ↓
Parse ComparisonTables response
    ↓
Generate Financial Analysis
    ↓
Cache to localStorage
    ↓
Render UI with tables and analysis tabs
```

---

## 🧠 Financial Analysis Engine

### How Analysis is Generated

**1. Parse Fee Data**
```typescript
// Extract fee amounts from transaction size columns
fees = [€1.0, €1.75, €3.5, €5.25, €7.0, €8.75, €17.5, €35.0, €175.0]
```

**2. Calculate Metrics**
```typescript
avgFee = sum(fees) / count(fees)
minFee = min(fees)
maxFee = max(fees)
```

**3. Classify Efficiency**
```typescript
if avgFee < €5     → "excellent"
if avgFee < €10    → "good"
if avgFee < €20    → "average"
if avgFee ≥ €20    → "poor"
```

**4. Generate Insights**
- Executive summary highlighting most competitive brokers
- Rankings with medals (🥇🥈🥉)
- Investment advice tailored to trading styles
- Broker-specific tips and recommendations
- Cost breakdown table
- Professional disclaimer

### Analysis Output Structure

```typescript
interface FinancialAnalysis {
  summary: string;                    // 2-3 paragraph executive summary
  mostAffordable: FeeBreakdown[];      // Top 3 brokers by cost
  costComparison: string;              // Formatted comparison table
  investmentAdvice: string;            // Personalized investment guidance
  tipsByBroker: Record<string, string[]>;  // Broker-specific recommendations
  generatedAt: Date;                   // Timestamp of analysis
}
```

---

## 🎨 UI Features

### 1. Control Panel
- **AI Model Selector**: Choose between Claude and GPT-4O
- **Refresh Button**: Trigger `/refresh-and-analyze` to update broker data
- **Reload Button**: Refresh comparison tables from cache
- **Status Display**: Shows last update time and loading states

### 2. Tab Navigation
- **Comparison Tables Tab**: Display price matrices
- **Financial Analysis Tab**: Show investment insights

### 3. Comparison Tables
Three responsive tables with:
- Broker names in first column
- Transaction amounts as column headers (€250, €500, €1000, etc.)
- Fee amounts color-coded with gradient badges
- Alternating row colors for readability
- Hover effects for interactivity

### 4. Financial Analysis Section
- **Executive Summary**: Market overview
- **Rankings**: Top 3 most affordable brokers with metrics
- **Cost Breakdown**: Formatted table of all brokers
- **Investment Advice**: Guidance for different investor types
- **Tips by Broker**: Personalized recommendations
- **Disclaimer**: Important legal notes

### 5. Styling Features
- Modern gradient backgrounds
- Glassmorphism effects (backdrop blur)
- Smooth transitions and hover states
- Professional green color palette (#0f5132, #16a34a, #d1fae5)
- Responsive grid layouts
- Mobile-optimized design

---

## 💾 Caching Strategy

### LocalStorage Key
```javascript
const STORAGE_KEY = "broker-cost-comparison-cache";
```

### Cache Structure
```javascript
{
  timestamp: "2025-12-06T10:30:45.123Z",
  data: {
    etfs: [...],
    stocks: [...],
    bonds: [...],
    notes: {...}
  }
}
```

### Caching Behavior

| Action | Cache Behavior |
|--------|---|
| App Load | Load from cache instantly (if available) |
| Manual Refresh | Skip cache, fetch fresh data |
| Successful Fetch | Store in cache automatically |
| Cache Failure | Continue with empty state |

---

## 🔧 Configuration

### API Host
Located in `src/App.tsx`:

```typescript
const API_HOST = "http://localhost:8000";
```

To use production API:
```typescript
const API_HOST = "https://api.yourdomain.com";
```

### Default AI Model
```typescript
const [selectedModel, setSelectedModel] = useState<"gpt-4o" | "claude-3-5-sonnet-20241022">(
  "claude-3-5-sonnet-20241022"  // Change this default
);
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Adjustments |
|------------|-------------|
| 1200px+ | Full grid layouts, 3-column tables |
| 768px - 1199px | 2-column grids, readable tables |
| < 768px | Single column, stacked controls |
| < 480px | Mobile optimization, reduced padding |

---

## 🎯 Type Definitions

### BrokerRow
```typescript
interface BrokerRow {
  broker: string;
  [key: string]: string | number | null;  // Transaction amounts
}
```

Example:
```json
{
  "broker": "ING Self Invest",
  "250": 1.0,
  "500": 1.75,
  "1000": 3.5,
  "50000": 175.0
}
```

### ComparisonTables
```typescript
interface ComparisonTables {
  etfs: BrokerRow[];
  stocks: BrokerRow[];
  bonds: BrokerRow[];
  notes: Record<string, Record<string, string>>;
}
```

### FinancialAnalysis
```typescript
interface FinancialAnalysis {
  summary: string;
  mostAffordable: FeeBreakdown[];
  costComparison: string;
  investmentAdvice: string;
  tipsByBroker: Record<string, string[]>;
  generatedAt: Date;
}
```

---

## 🚨 Error Handling

### Common Errors

**1. API Connection Failed**
```
Error: Unable to contact API server.
Solution: Ensure BE Invest API is running on localhost:8000
```

**2. Invalid Response**
```
Error: API response does not include valid comparison tables.
Solution: Check that /cost-comparison-tables returns valid ComparisonTables object
```

**3. Refresh Failed**
```
Error: Refresh failed (500 Internal Server Error).
Solution: Check BE Invest server logs for LLM API errors
```

### Error Recovery
- App displays error message to user
- Cached data remains available (if any)
- User can retry by clicking buttons
- No data loss occurs

---

## 🧪 Development & Testing

### Build Production Bundle
```bash
npm run build
```

Output: `dist/` folder ready for deployment

### Type Check
```bash
npx tsc --noEmit
```

### Lint (if configured)
```bash
npm run lint
```

---

## 📋 Features Implemented

### ✅ Core Features
- [x] BE Invest API integration
- [x] Cost comparison table rendering
- [x] Financial analysis generation
- [x] Claude model support
- [x] GPT-4O model support
- [x] Model selector dropdown
- [x] Dual tab interface
- [x] LocalStorage caching
- [x] Real-time refresh button

### ✅ UI/UX Features
- [x] Modern gradient styling
- [x] Glassmorphism effects
- [x] Responsive design
- [x] Loading states
- [x] Error messages
- [x] Status indicators
- [x] Smooth transitions
- [x] Mobile optimization

### ✅ Analysis Features
- [x] Fee average calculation
- [x] Cost efficiency ranking
- [x] Executive summary generation
- [x] Top broker identification
- [x] Investment advice
- [x] Broker-specific tips
- [x] Cost comparison tables

---

## 🚀 Deployment

### Local Development
```bash
npm run dev
# Access at http://localhost:5173
```

### Production Build
```bash
npm run build
# Output in dist/ directory
```

### Deploy to Netlify
```bash
# Option 1: Connect GitHub repo
# Option 2: Manual deployment
netlify deploy --prod --dir=dist
```

### Deploy to Vercel
```bash
vercel --prod
```

### Environment Variables
If using environment-based config:

```javascript
// .env.local
VITE_API_HOST=http://localhost:8000

// src/App.tsx
const API_HOST = import.meta.env.VITE_API_HOST || "http://localhost:8000";
```

---

## 📊 Performance Metrics

### Bundle Size
- **CSS**: 22.61 KB (4.55 KB gzipped)
- **JavaScript**: 152.28 KB (49.31 KB gzipped)
- **Total**: ~175 KB (~54 KB gzipped)

### Load Time
- **Cached Load**: < 100ms
- **Fresh Load**: ~500ms - 2s (depends on API response)
- **Refresh**: Runs in background without blocking UI

---

## 🔗 API Reference Quick Lookup

### Cost Comparison Tables
```bash
curl "http://localhost:8000/cost-comparison-tables?model=claude-3-5-sonnet-20241022"
```

**Response Fields:**
- `etfs[].broker`, `etfs[].250`, `etfs[].500`, ... `etfs[].50000`
- `stocks[].broker`, `stocks[].250`, ... `stocks[].50000`
- `bonds[].broker`, `bonds[].250`, ... `bonds[].50000`
- `notes[brokerName][instrumentType]`

### Refresh & Analyze
```bash
curl -X POST "http://localhost:8000/refresh-and-analyze?model=claude-3-5-sonnet-20241022" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:** Same structure as cost comparison tables

---

## 🐛 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Unable to contact API" | BE Invest server not running | Start server: `python scripts/run_api.py` |
| Empty tables displayed | No broker data generated | Run: `python scripts/generate_exhaustive_summary.py` |
| Wrong model used | Configuration issue | Check `selectedModel` state in App.tsx |
| Cache not loading | LocalStorage full or corrupted | Clear browser storage: `localStorage.clear()` |
| Slow refresh | LLM API latency | Expected for first refresh; subsequent loads faster |

---

## 📚 Additional Resources

- **BE Invest API Docs**: `c:\Users\rajes\PycharmProjects\be-invest\API_CLIENT_INTEGRATION.md`
- **App README**: `c:\Users\rajes\PycharmProjects\ing-llm-testing\README.md`
- **API Documentation**: `c:\Users\rajes\PycharmProjects\ing-llm-testing\API_DOCUMENTATION.md`
- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev

---

## 📝 Version Information

- **App Version**: 1.0.0
- **BE Invest API**: v0.1.0
- **React**: 18.3
- **TypeScript**: 5.4
- **Vite**: 5.4.21
- **Last Updated**: December 6, 2025

---

## ✨ Next Steps

### Recommended Enhancements

1. **Export to PDF**: Add ability to export analysis
2. **Dark Mode**: Toggle between light/dark themes
3. **Historical Data**: Track fee changes over time
4. **Custom Filters**: Filter by fee range, broker, instrument type
5. **Comparison Tool**: Compare specific brokers head-to-head
6. **API Key Management**: Secure environment variable handling
7. **Advanced Analytics**: Add charts and graphs for fee trends
8. **Broker Ratings**: Add user reviews and ratings system
9. **Email Alerts**: Notify when fees change
10. **API Rate Limiting**: Implement client-side rate limit handling

---

**Questions or Issues?** Check the API logs at `be-invest/data/logs/` or review browser console for client-side errors.
