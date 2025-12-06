# 🚀 Quick Start Guide

## What You Need to Know in 5 Minutes

Your broker fee comparison app now integrates with the BE Invest API and includes AI-powered financial analysis. Here's how to get it running:

---

## ⚡ 30-Second Setup

### Step 1: Start the API Server
```bash
cd c:\Users\rajes\PycharmProjects\be-invest
python scripts/run_api.py
```
**Result:** API running on `http://localhost:8000`

### Step 2: Start the App
```bash
cd c:\Users\rajes\PycharmProjects\ing-llm-testing
npm run dev
```
**Result:** App running on `http://localhost:5173`

### Step 3: Open Browser
```
http://localhost:5173
```

✅ **Done!** Your app is ready to use.

---

## 📊 What You'll See

### On First Load:
1. **Header** with app title and description
2. **Control Panel** with:
   - AI Model selector (Claude or GPT-4O)
   - Refresh Data button
   - Reload Tables button
   - Status info

3. **Tab Navigation**:
   - Comparison Tables (default)
   - Financial Analysis

4. **Comparison Tables** showing:
   - ETFs price comparison
   - Stocks price comparison
   - Bonds price comparison
   - Broker notes

### When You Click "Financial Analysis":
- Executive summary of the market
- Top 3 brokers ranking (🥇🥈🥉)
- Detailed cost metrics
- Investment advice
- Broker-specific tips
- Legal disclaimer

---

## 🎯 Key Features

### Comparison Tables
```
Broker          €250    €500    €1,000   €5,000   €10,000
ING             €1.00   €1.75   €3.50    €17.50   €35.00
Bolero          €2.50   €5.00   €5.00    €10.00   €15.00
Keytrade        €2.45   €5.95   €14.95   €14.95   €52.45
```

### Financial Analysis
- **Excellent**: < €5 average fee 🟢
- **Good**: €5-€10 average fee 🟡
- **Average**: €10-€20 average fee 🟠
- **Poor**: > €20 average fee 🔴

---

## 🎮 Using the App

### To See Comparison Tables:
1. Click "Comparison Tables" tab (default view)
2. See prices for ETFs, Stocks, Bonds
3. Compare broker costs at different transaction sizes

### To See Financial Analysis:
1. Click "Financial Analysis" tab
2. Read executive summary
3. See top 3 most affordable brokers
4. Check investment advice for your type

### To Change AI Model:
1. Click dropdown (top left)
2. Choose "GPT-4O" or "Claude 3.5 Sonnet"
3. Click "Reload Tables" or "Refresh Data"

### To Update Broker Data:
1. Click "🔄 Refresh Data" button
2. Wait for update (may take 10-30 seconds)
3. See latest fees from broker PDFs

---

## 💾 What Gets Saved

Your comparison tables automatically save to browser cache. If you:
- Close the browser → Data still available when you reopen
- Refresh the page → Loads instantly from cache
- Click "Refresh Data" → Fetches new data from API

To clear cache:
```javascript
// In browser console
localStorage.clear()
```

---

## ⚠️ Important Notes

### First Time Setup:
You only need to do this once:

```bash
cd c:\Users\rajes\PycharmProjects\be-invest
python scripts/generate_exhaustive_summary.py
```

This downloads latest broker fee PDFs and analyzes them.

### API Keys:
Make sure you have set:
```bash
export OPENAI_API_KEY="sk-..."        # For GPT-4O
export ANTHROPIC_API_KEY="sk-ant-..." # For Claude
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unable to contact API" | Start BE Invest server with `python scripts/run_api.py` |
| Empty tables | Run `python scripts/generate_exhaustive_summary.py` |
| Wrong model | Select correct model in dropdown and reload |
| Slow loading | First load is slow (API analyzing). Subsequent loads are instant (cached) |
| Analysis not showing | Wait for tables to load, then click "Financial Analysis" tab |

---

## 📚 Learn More

For detailed information:

1. **Integration Guide**: `BE_INVEST_INTEGRATION.md`
   - Full API documentation
   - Architecture explanation
   - Configuration options

2. **Financial Analysis**: `FINANCIAL_ANALYSIS_GUIDE.md`
   - How analysis is generated
   - What metrics mean
   - How to customize

3. **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
   - What was built
   - Build results
   - Feature descriptions

---

## ✨ That's It!

Your app is ready to use. The BE Invest API integration and financial analysis engine will:

1. ✅ Fetch broker fee data from API
2. ✅ Generate financial metrics automatically
3. ✅ Create AI-powered insights
4. ✅ Display beautiful comparison tables
5. ✅ Cache everything for fast loading

Enjoy exploring broker fees! 🎉

---

**Quick Commands Reference:**

```bash
# Start everything
cd c:\Users\rajes\PycharmProjects\be-invest
python scripts/run_api.py

# In another terminal
cd c:\Users\rajes\PycharmProjects\ing-llm-testing
npm run dev

# Open browser
http://localhost:5173
```

**That's all you need!**
