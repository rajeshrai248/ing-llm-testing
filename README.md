# Belgian Broker Fee Comparator

A real-time React application that compares broker fees across major Belgian financial institutions (ING, Keytrade, Bolero, etc.).

## ?? Quick Start

### Local Development
\\\ash
npm install
npm run dev
\\\
Visit: \http://localhost:5173\

### Build for Production
\\\ash
npm run build
npm run preview
\\\

##  Live Deployment

**Public URL:** \https://rajeshrai248.uk\

Access the application from anywhere with HTTPS via Cloudflare Tunnel.

##  Features

-  Real-time fee comparison across multiple brokers
-  Financial analysis with annual cost simulations
-  Calculation logic tooltips
-  Market analysis with cheapest options
-  Broker ratings and comparison
-  Responsive desktop & mobile design

##  Tech Stack

- **Frontend:** React 18.3, TypeScript 5.4, Vite 5.3
- **Styling:** CSS3 with professional design
- **Deployment:** nginx + Cloudflare Tunnel
- **Backend:** REST API on localhost:8000

##  Documentation

All documentation has been organized in the [docs/](docs/) folder:

**Deployment:**
- \EC2_DEPLOYMENT.md\ - AWS EC2 setup guide
- \WINDOWS_LOCAL_DEPLOYMENT.md\ - Local nginx on Windows
- \DEPLOYMENT_CHECKLIST.md\ - Pre/post deployment checks
- \QUICK_DEPLOY.md\ - 5-minute quick start

**Guides:**
- \FINANCIAL_ANALYSIS_GUIDE.md\ - Analysis features explained
- \API_DOCUMENTATION.md\ - Backend API reference
- \NETWORK_ACCESS.md\ - Public internet access options
- \BE_INVEST_INTEGRATION.md\ - Integration details

##  Current Status

-  Application deployed and live at https://rajeshrai248.uk
-  Desktop refresh working (F5, Ctrl+R, Ctrl+Shift+R)
-  Mobile support with Android/iOS browsers
-  All API endpoints proxied through nginx
-  HTTPS enabled via Cloudflare

##  Mobile Tips

**Android Chrome:**
- First load: Works 
- Subsequent refreshes: Close and reopen Chrome
- Hard refresh: Long-press refresh  "Empty cache and hard refresh"

**iPhone Safari:**
- Pull-to-refresh works reliably
- Or: Settings  Safari  Clear History and Website Data

##  Access Issues

If your organization blocks the domain:
1. Use a VPN (ProtonVPN, ExpressVPN)
2. Use mobile data/hotspot
3. Request IT to whitelist \ajeshrai248.uk\

##  Project Structure

\\\
src/
 App.tsx          Main application
 main.tsx         React entry
 types.ts         TypeScript definitions
 constants.ts     API endpoints
 index.css        Global styles
 utils/           Helper functions

docs/                Documentation
dist/                Production build
\\\

##  Deployment

### Local (Windows)
\\\powershell
.\\deploy-local-nginx.ps1
\\\

### Cloudflare Tunnel
\\\powershell
cloudflared tunnel run broker-app
\\\

### AWS EC2
See [docs/EC2_DEPLOYMENT.md](docs/EC2_DEPLOYMENT.md)

##  Security

-  HTTPS via Cloudflare
-  Security headers configured
-  Gzip compression enabled
-  No sensitive data in frontend

##  Support

See documentation in [docs/](docs/) folder for detailed guides and troubleshooting.

---

**Last Updated:** December 17, 2025
**Status:** Production Ready
