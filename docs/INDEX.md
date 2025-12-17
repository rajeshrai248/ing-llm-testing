# Documentation Index

Complete documentation for the Belgian Broker Fee Comparator application.

## 🚀 Getting Started

1. **First time?** → Start with main [README.md](../README.md)
2. **Want to deploy locally?** → [WINDOWS_LOCAL_DEPLOYMENT.md](WINDOWS_LOCAL_DEPLOYMENT.md)
3. **Want to deploy to cloud?** → [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md)
4. **Need quick 5-min setup?** → [QUICK_DEPLOY.md](QUICK_DEPLOY.md)

## 📋 Deployment Guides

| Document | Purpose | Best For |
|----------|---------|----------|
| [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md) | Complete AWS EC2 setup with automation | Production deployment |
| [WINDOWS_LOCAL_DEPLOYMENT.md](WINDOWS_LOCAL_DEPLOYMENT.md) | Local Windows nginx setup with PowerShell scripts | Local development/testing |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Pre and post deployment verification steps | Validating deployments |
| [QUICK_DEPLOY.md](QUICK_DEPLOY.md) | 5-minute quick start for EC2 | Fast deployment |

## 📚 Feature Guides

| Document | Purpose | Read When |
|----------|---------|-----------|
| [FINANCIAL_ANALYSIS_GUIDE.md](FINANCIAL_ANALYSIS_GUIDE.md) | Explains financial analysis features and sections | Understanding analysis features |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Backend API endpoint reference | Integrating with backend |
| [BE_INVEST_INTEGRATION.md](BE_INVEST_INTEGRATION.md) | BE Invest integration details | Working with data integration |

## 🌍 Network & Access

| Document | Purpose | Read When |
|----------|---------|-----------|
| [NETWORK_ACCESS.md](NETWORK_ACCESS.md) | Public internet access options (VPN, port forwarding, Cloudflare Tunnel) | Making app accessible online |

## 🔗 Document Relationships

```
README.md (Start here)
    ├── For quick local setup
    │   └── WINDOWS_LOCAL_DEPLOYMENT.md
    │       └── DEPLOYMENT_CHECKLIST.md
    │
    ├── For cloud deployment
    │   ├── EC2_DEPLOYMENT.md
    │   │   └── DEPLOYMENT_CHECKLIST.md
    │   └── QUICK_DEPLOY.md
    │
    ├── For understanding features
    │   ├── FINANCIAL_ANALYSIS_GUIDE.md
    │   ├── API_DOCUMENTATION.md
    │   └── BE_INVEST_INTEGRATION.md
    │
    └── For network access
        └── NETWORK_ACCESS.md
```

## 📖 Reading Order by Task

### Task: Deploy Locally on Windows
1. [README.md](../README.md) - Overview
2. [WINDOWS_LOCAL_DEPLOYMENT.md](WINDOWS_LOCAL_DEPLOYMENT.md) - Setup
3. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Verify

### Task: Deploy to AWS EC2
1. [README.md](../README.md) - Overview
2. [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md) - Full guide
3. [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Alternative quick method
4. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Verify

### Task: Make App Publicly Accessible
1. [NETWORK_ACCESS.md](NETWORK_ACCESS.md) - Access options
2. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Verify connectivity

### Task: Understand Financial Analysis
1. [FINANCIAL_ANALYSIS_GUIDE.md](FINANCIAL_ANALYSIS_GUIDE.md) - Features explained
2. [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Data structure

### Task: Integrate with Backend
1. [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Endpoint reference
2. [BE_INVEST_INTEGRATION.md](BE_INVEST_INTEGRATION.md) - Integration details

## 💡 Quick References

### Common Commands

**Local Development:**
```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Build for production
```

**Windows Deployment:**
```powershell
.\deploy-local-nginx.ps1   # Deploy locally
```

**Cloudflare Tunnel:**
```powershell
cloudflared tunnel run broker-app   # Start tunnel
```

### Important URLs

| Environment | URL | Protocol |
|-----------|-----|----------|
| Development | http://localhost:5173 | HTTP |
| Local Deployment | http://localhost | HTTP |
| Production | https://rajeshrai248.uk | HTTPS |
| Backend API | http://localhost:8000 | HTTP |

### Key Folders

| Folder | Purpose |
|--------|---------|
| `src/` | React source code |
| `docs/` | Documentation |
| `dist/` | Production build output |
| `docs/` | All documentation files |

## 📝 File Naming Convention

- `*_DEPLOYMENT.md` - Deployment guides
- `*_GUIDE.md` - Feature/usage guides
- `*_DOCUMENTATION.md` - Technical reference
- `*_CHECKLIST.md` - Verification steps
- `*_INTEGRATION.md` - Integration instructions

## 🔄 Document Maintenance

**Last Updated:** December 17, 2025

Documentation is organized and consolidated for clarity:
- ✅ Redundant files removed
- ✅ Related documents grouped
- ✅ Clear reading order established
- ✅ Cross-references included

---

**Need help?** Start with [README.md](../README.md) or find your task above.
