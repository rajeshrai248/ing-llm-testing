# API Documentation

## Overview

The Belgian Broker Fee Comparator frontend communicates with a backend API to fetch and manage broker fee data. This document describes the expected API contracts and data structures.

## Base URL

```
http://localhost:8000
```

For production, update the `API_HOST` constant in `src/App.tsx`.

## Endpoints

### 1. GET /summary

Fetches the complete broker cost analyses data from the backend.

#### Request

```http
GET /summary HTTP/1.1
Host: localhost:8000
Content-Type: application/json
```

#### Response

**Status Code:** 200 OK

**Content-Type:** application/json

**Body:**

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
          },
          {
            "condition": "Euronext (Brussels, Amsterdam, Paris) - Via web and app",
            "fee": "0.35% Min. €1",
            "notes": "Discounted fee for online trades"
          }
        ]
      },
      {
        "category": "Trading - Bonds",
        "description": "Brokerage fees for bonds",
        "tiers": [
          {
            "condition": "Bonds - Normal charge",
            "fee": "0.50% Min. €50",
            "notes": "Standard brokerage fee for bonds"
          }
        ]
      }
    ],
    "custody_charges": {
      "general": "Free for funds and securities issued by ING",
      "by_instrument": [
        {
          "instrument": "Shares, ETFs, warrants",
          "fee": "0.02% Min. €0.25 per month",
          "conditions": "Charged per line in an investment account"
        },
        {
          "instrument": "Bonds",
          "fee": "0.01% Min. €0.25 per month",
          "conditions": "Charged per line in an investment account"
        }
      ],
      "exceptions": "Free custody for funds and securities issued by ING"
    },
    "deposit_withdrawal": [
      {
        "method": "Bank transfer",
        "fee": "Free",
        "timing": "1-2 days",
        "conditions": "No limits specified"
      }
    ],
    "account_fees": {
      "opening": "Free",
      "closure": "Free",
      "inactivity": "Not specified",
      "minimum_balance": "None",
      "minimum_deposit": "None"
    },
    "special_fees": [
      {
        "name": "FX conversion",
        "rate": "0.5%",
        "conditions": "Applied to currency exchanges",
        "exceptions": "None specified"
      }
    ],
    "supported_instruments": [
      "Equities",
      "ETFs",
      "Bonds"
    ],
    "notes": "All fees are subject to VAT where applicable. Tax on stock exchange orders (TOB) and other taxes may apply.",
    "key_observations": [
      "Discounts available for online trades",
      "Custody fees waived for ING-issued instruments",
      "Specific fees for foreign securities and certain markets"
    ]
  },
  "Bolero": {
    "broker_name": "Bolero",
    "summary": "Complete fee overview",
    "fee_categories": [ /* ... */ ],
    "custody_charges": { /* ... */ },
    "deposit_withdrawal": [ /* ... */ ],
    "account_fees": { /* ... */ },
    "special_fees": [ /* ... */ ],
    "supported_instruments": [ /* ... */ ],
    "notes": "...",
    "key_observations": [ /* ... */ ]
  }
}
```

#### Response Schema

**Root Level:** Object with broker names as keys

Each broker object contains:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| broker_name | string | Yes | Name of the broker |
| summary | string | Yes | Brief description of fee overview |
| fee_categories | array | Yes | Array of fee category objects |
| custody_charges | object | No | Custody and safekeeping fees |
| deposit_withdrawal | array | No | Deposit and withdrawal methods |
| account_fees | object | No | Account management fees |
| special_fees | array | No | Special fees (FX, data, etc.) |
| supported_instruments | array | No | List of supported instruments |
| notes | string | No | General notes about fees/taxes |
| key_observations | array | No | Important observations for investors |

#### Fee Category Schema

```json
{
  "category": "Trading - Equities",
  "description": "Detailed breakdown",
  "tiers": [
    {
      "condition": "Euronext (Brussels, Amsterdam, Paris) - Normal charge",
      "fee": "1% Min. €40",
      "notes": "Standard brokerage fee"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Yes | Category name (e.g., "Trading - Equities") |
| description | string | Yes | Description of what fees apply |
| tiers | array | Yes | Array of tier/fee objects |

#### Tier Schema

```json
{
  "condition": "Euronext (Brussels, Amsterdam, Paris) - Normal charge",
  "fee": "1% Min. €40",
  "notes": "Standard brokerage fee for Euronext trades"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| condition | string | Yes | Fee condition or trade range |
| fee | string | Yes | Fee amount (can be €X, X%, or mixed) |
| notes | string | No | Additional information about the fee |

#### Error Response

**Status Code:** 400 Bad Request / 500 Internal Server Error

**Body:**

```json
{
  "error": "Description of the error",
  "details": "Additional error context"
}
```

#### Example cURL Request

```bash
curl -X GET "http://localhost:8000/summary" \
  -H "Content-Type: application/json"
```

#### Example JavaScript Request

```javascript
const response = await fetch('http://localhost:8000/summary', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

### 2. POST /refresh-and-analyze

Triggers a refresh of broker data by calling the LLM analysis service and returns updated fee data.

#### Request

```http
POST /refresh-and-analyze HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{}
```

#### Request Body

Empty object `{}` or can contain optional parameters for the analysis service.

#### Response

**Status Code:** 200 OK

**Content-Type:** application/json

**Body:** Same structure as `/summary` endpoint (see above)

#### Error Response

**Status Code:** 400 Bad Request / 500 Internal Server Error / 503 Service Unavailable

**Body:**

```json
{
  "error": "Failed to refresh data",
  "reason": "Backend analysis service returned error",
  "timestamp": "2025-12-06T10:30:00Z"
}
```

#### Example cURL Request

```bash
curl -X POST "http://localhost:8000/refresh-and-analyze" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Example JavaScript Request

```javascript
const response = await fetch('http://localhost:8000/refresh-and-analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
});

const data = await response.json();
```

---

## Response Handling

### Success Flow

1. Frontend calls API endpoint
2. Backend returns JSON with broker data
3. Frontend validates response structure
4. Data is stored in state and localStorage
5. UI renders broker sections with fee tables

### Error Flow

1. Frontend calls API endpoint
2. Backend returns error status or malformed data
3. Frontend displays error message to user
4. User can:
   - Retry by clicking "Refresh Data" button
   - View cached data if available
   - Check browser console for details

### Validation Rules

The frontend expects:

- **Valid JSON:** Response must be valid JSON
- **Object Format:** Root level must be an object (not array)
- **Broker Keys:** Keys should be broker names (strings)
- **Fee Categories:** Each broker must have `fee_categories` array
- **Tiers Structure:** Each category must have `tiers` array with condition/fee objects

Invalid entries are automatically filtered out (e.g., entries with `error` field).

---

## CORS Requirements

The API must respond with proper CORS headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Or for specific origin:

```http
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Rate Limiting

No rate limiting is currently enforced. However, it's recommended to:

- Avoid calling `/refresh-and-analyze` more than once per minute
- Cache responses for 1-24 hours on the backend
- Implement rate limiting if exposing API publicly

---

## Data Format Examples

### Fee Format Variations

The `fee` field can contain various formats:

```
"1% Min. €40"           # Percentage with minimum
"€2.50"                 # Fixed amount
"0.5%"                  # Pure percentage
"€15/€10,000 (max €50)" # Tiered with max
"3%"                    # Simple percentage
"Free"                  # No fee
"1.5 per contract"      # Per-unit fee
```

### Condition Format Variations

The `condition` field describes when the fee applies:

```
"Up to €250"
"€250.01 - €1,000"
"€1,000.01 - €2,500"
"Above €70,000"
"Euronext Markets"
"US Markets"
"Per contract"
"Monthly custody"
```

---

## Supported Instruments List

Common instrument types in responses:

- Equities (Stocks)
- ETFs (Exchange-Traded Funds)
- Bonds
- Options
- Futures
- Funds (Investment/Mutual)
- Leveraged Products
- Warrants
- Crypto
- Structured Products

---

## Backend Implementation Notes

### Expected Service Architecture

```
Frontend (React)
    ↓
API Layer (Express/FastAPI/etc.)
    ↓
Data Service (Returns broker_cost_analyses.json)
    ↓
LLM Service (Optional, for /refresh-and-analyze)
    ↓
Broker Fee Sources (PDFs, websites, APIs)
```

### Sample Backend Response (Node.js/Express)

```javascript
app.get('/summary', (req, res) => {
  const brokerData = require('./data/broker_cost_analyses.json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(brokerData);
});

app.post('/refresh-and-analyze', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const updatedData = await callLLMAnalysis();
    const cleaned = filterValidBrokers(updatedData);
    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});
```

---

## Testing the API

### Using Postman

1. Create GET request to `http://localhost:8000/summary`
2. Create POST request to `http://localhost:8000/refresh-and-analyze`
3. Verify response structure matches schema
4. Test CORS headers in response

### Using curl

```bash
# Test GET /summary
curl -i http://localhost:8000/summary

# Test POST /refresh-and-analyze
curl -i -X POST http://localhost:8000/refresh-and-analyze -H "Content-Type: application/json" -d "{}"
```

### Using Node.js

```javascript
const http = require('http');

http.get('http://localhost:8000/summary', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log('Brokers:', Object.keys(parsed));
  });
}).on('error', err => console.error(err));
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-06 | Initial API documentation for broker cost analyses |

---

**Last Updated:** December 6, 2025
