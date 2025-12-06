# Belgian Broker Fee Comparator

A modern React web application for comparing trading fees across Belgian investment brokers. The app fetches detailed broker fee structures from an API and displays them in an organized, user-friendly interface.

## 📋 Overview

This application helps investors in Belgium understand and compare:
- **Trading fees** across different instrument types (Equities, Bonds, Options, Funds, etc.)
- **Custody charges** and ongoing account fees
- **Deposit/Withdrawal** methods and associated costs
- **Special fees** like FX conversion rates
- **Supported instruments** by each broker

Currently supported brokers:
- ING Self Invest
- Bolero
- Keytrade Bank
- Degiro Belgium
- Belfius (data pending)
- Revolut (data pending)

## 🚀 Quick Start

### Installation

```bash
# Clone or navigate to the project
cd ing-llm-testing

# Install dependencies
npm install

# Install markdown renderer (if not already installed)
npm install react-markdown
```

### Development Server

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
ing-llm-testing/
├── src/
│   ├── App.tsx           # Main React component
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   ├── types.ts          # TypeScript interfaces
│   ├── vite-env.d.ts     # Vite environment types
│   └── utils/
│       └── calc.ts       # Utility functions (legacy)
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── README.md             # This file
```

## 🔌 API Integration

### Endpoints

The application expects a backend API running at `http://localhost:8000` with the following endpoints:

#### 1. `GET /summary`
Fetches the complete broker cost analyses data.

**Response Format:**
```json
{
  "ING Self Invest": {
    "broker_name": "ING Self Invest",
    "summary": "Complete fee overview",
    "fee_categories": [
      {
        "category": "Trading - Equities",
        "description": "Detailed breakdown",
        "tiers": [
          {
            "condition": "Euronext (Brussels, Amsterdam, Paris) - Normal charge",
            "fee": "1% Min. €40",
            "notes": "Standard brokerage fee for Euronext trades"
          }
        ]
      }
    ],
    "custody_charges": {},
    "deposit_withdrawal": [],
    "account_fees": {},
    "special_fees": [],
    "supported_instruments": ["Equities", "ETFs", "Bonds"],
    "notes": "All fees are subject to VAT where applicable.",
    "key_observations": []
  },
  "Bolero": { /* ... */ }
}
```

**Expected Data Structure:**
- **broker_name** (string): Name of the broker
- **summary** (string): Brief description of the fee overview
- **fee_categories** (array): Array of fee categories
  - **category** (string): Name of the fee category (e.g., "Trading - Equities")
  - **description** (string): Description of the category
  - **tiers** (array): Array of tier objects
    - **condition** (string): Condition/requirement for this fee
    - **fee** (string): The fee amount or percentage
    - **notes** (optional, string): Additional information
- **custody_charges** (object): Details about custody/safekeeping fees
- **deposit_withdrawal** (array): Available deposit/withdrawal methods
- **account_fees** (object): Account opening, closure, and maintenance fees
- **special_fees** (array): FX conversion, data fees, etc.
- **supported_instruments** (array): List of supported trading instruments
- **notes** (string): General notes about fees and taxes
- **key_observations** (array): Important points for investors

#### 2. `POST /refresh-and-analyze`
Refreshes the broker data by calling the LLM analysis service.

**Request Body:**
```json
{}
```

**Response:** Same format as `/summary` endpoint

## 🎨 UI Components

### Page Layout

1. **Header Section**
   - Application title
   - Subtitle describing the purpose
   - Link to detailed sources

2. **Highlight Section**
   - Quick reference chips for important considerations
   - Categories: Fees, Taxes, Convenience, Account Opening, Safety

3. **Status Panel**
   - Refresh button to update data from API
   - Last update timestamp
   - Error messages (if any)
   - Status indicators (Loading, Refreshing, etc.)

4. **Broker Sections**
   - One section per broker
   - Displays all fee categories with tiered pricing
   - Shows supported instruments
   - Key observations and notes

5. **Fee Tables**
   - Clean, readable table format
   - Columns: Condition | Fee | Notes
   - Color-coded for easy scanning
   - Hover effects for better UX

## 💾 Data Caching

The application implements localStorage caching for optimal performance:

- **Cache Key:** `broker-summary-cache`
- **Cache Structure:**
  ```json
  {
    "timestamp": "2025-12-06T10:30:00.000Z",
    "data": { /* broker data */ }
  }
  ```
- **Benefits:**
  - Instant load on app revisit
  - Reduced API calls
  - Works offline with cached data
  - Manual refresh always fetches latest data

## 🎯 Key Features

### ✅ Responsive Design
- Mobile-friendly layout
- Adaptive tables with horizontal scrolling
- Touch-friendly controls
- Works on all screen sizes

### ✅ Smart Data Display
- Automatically detects and hides empty data
- Graceful fallbacks for missing information
- Organized fee categories
- Colored visual indicators

### ✅ Accessibility
- Semantic HTML structure
- Color contrast compliant
- Keyboard navigation support
- Clear visual hierarchy

### ✅ Performance
- Lightweight bundle (~48KB gzipped)
- Fast rendering with React hooks
- Efficient caching strategy
- No external icon libraries

## 🎨 Styling

### Color Palette
- **Primary Green:** `#16a34a` (Actions, highlights)
- **Dark Green:** `#0f5132` (Text, headings)
- **Light Green:** `#d1fae5` (Backgrounds, chips)
- **Accent Green:** `#34d399` (Gradients)
- **Text Gray:** `#4a6b5e` (Body text)
- **Background:** Gradient from `#f5faf8` to `#f0f8f4`

### Typography
- **Font:** Inter (system font stack fallback)
- **Headings:** 700 weight
- **Body:** 400 weight
- **Monospace:** Monaco/Menlo for code/fees

### Visual Effects
- Glassmorphism (backdrop blur, transparency)
- Subtle shadows and hover states
- Smooth transitions (0.2s - 0.3s)
- Gradient overlays on headers

## 🔧 Technologies Used

- **React 18.3** - UI framework
- **TypeScript 5.4** - Type safety
- **Vite 5.4** - Build tool and dev server
- **React Markdown** - Markdown rendering (optional)

## 📦 Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-markdown": "^9.0.1"
}
```

### Dev Dependencies
```json
{
  "@types/react": "^18.3.1",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.0",
  "typescript": "^5.4.5",
  "vite": "^5.4.21"
}
```

## 🚀 API Configuration

### Environment Setup

The API host is configured as a constant in `src/App.tsx`:

```typescript
const API_HOST = "http://localhost:8000";
const SUMMARY_ENDPOINT = `${API_HOST}/summary`;
const REFRESH_ENDPOINT = `${API_HOST}/refresh-and-analyze`;
```

### For Production

To change the API host for production deployment:

1. Open `src/App.tsx`
2. Update the `API_HOST` constant:
   ```typescript
   const API_HOST = "https://your-api-domain.com";
   ```
3. Rebuild: `npm run build`

## 🔄 Data Flow

```
┌─────────────────────┐
│   App Load/Refresh  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check localStorage │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
  Found       Not Found
    │             │
    ├─────────────┤
    │             │
    ▼             ▼
Set State    Fetch API
    │             │
    └─────────────┘
         │
         ▼
┌─────────────────────┐
│  Save to Cache      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Render Broker Sections
└─────────────────────┘
```

## 📝 Type Definitions

### Main Interfaces

```typescript
interface Tier {
  condition: string;
  fee: string;
  notes?: string;
}

interface FeeCategory {
  category: string;
  description: string;
  tiers: Tier[];
}

interface BrokerData {
  broker_name: string;
  summary: string;
  fee_categories: FeeCategory[];
  custody_charges?: Record<string, unknown>;
  deposit_withdrawal?: Record<string, unknown>;
  account_fees?: Record<string, unknown>;
  special_fees?: Record<string, unknown>;
  supported_instruments?: string[];
  notes?: string;
  key_observations?: string[];
}

interface BrokerAnalysesResponse {
  [brokerName: string]: BrokerData;
}
```

## 🐛 Troubleshooting

### API Connection Issues

**Problem:** "Unable to contact API server" error

**Solutions:**
1. Ensure backend is running on `http://localhost:8000`
2. Check CORS headers in backend response:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```
3. Open browser DevTools → Network tab → check `/summary` request

### Data Not Loading

**Problem:** "No pricing data was returned by the API"

**Solutions:**
1. Verify API response structure matches expected format
2. Check that brokers have valid `fee_categories` array
3. Look for error entries with `"error": "No text data"`
4. Clear localStorage: Open DevTools → Application → Storage → Clear cache

### Styling Issues

**Problem:** Styles not applied correctly

**Solutions:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Rebuild: `npm run build`

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

This generates an optimized build in the `dist/` directory:
- `dist/index.html` - Entry point
- `dist/assets/` - CSS and JS bundles

### Deploy to Static Host

The app can be deployed to any static host:
- **Netlify:** Drag and drop the `dist/` folder
- **Vercel:** Connect GitHub repo, select `dist/` as build output
- **GitHub Pages:** Push `dist/` to gh-pages branch
- **AWS S3 + CloudFront:** Upload `dist/` contents to S3

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📊 Performance Metrics

- **Initial Load:** ~2-3 seconds (with API call)
- **Cached Load:** <100ms
- **Bundle Size:** 148.10 KB (47.84 KB gzipped)
- **Module Count:** 31 modules
- **CSS Size:** 13.65 KB (3.09 KB gzipped)

## 🤝 Contributing

When updating the application:

1. **Update Types First:** Modify interfaces in `src/App.tsx` or create types file
2. **Update Component:** Modify `src/App.tsx` with new logic
3. **Update Styles:** Add CSS to `src/index.css` following existing patterns
4. **Build & Test:** Run `npm run build` to verify no errors
5. **Test Locally:** Run `npm run dev` and test in browser

## 📄 License

This project is part of the BE Invest analysis suite.

## 🔗 Related Projects

- **BE Invest Backend:** API server providing broker data
- **BE Invest Data Pipeline:** LLM-based fee extraction and analysis

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review API response structure
3. Check browser console for error messages
4. Verify backend service is running

---

**Last Updated:** December 6, 2025
**Version:** 1.0.0
