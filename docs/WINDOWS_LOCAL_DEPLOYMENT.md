# Windows nginx Local Deployment Guide

## Deployment to Local nginx Server

This guide walks you through deploying the Broker Fee Comparator frontend to your local Windows nginx server at `C:\Users\rajes\Downloads\nginx-1.29.4`.

## Prerequisites

- ✅ nginx 1.29.4 installed at `C:\Users\rajes\Downloads\nginx-1.29.4`
- ✅ Application built (`npm run build` completed successfully)
- ✅ Backend API running on `http://localhost:8000`

## Step 1: Verify Application Build

```powershell
# Build the application
npm run build

# Verify dist folder exists and contains files
Get-ChildItem -Path ".\dist" -Recurse | Select-Object FullName
```

Expected output should show:
- `dist/index.html`
- `dist/assets/index-*.js`
- `dist/assets/index-*.css`

## Step 2: Copy nginx Configuration

The configuration file has already been created at:
```
C:\Users\rajes\Downloads\nginx-1.29.4\conf\broker-comparator.conf
```

## Step 3: Update Main nginx Configuration

Edit the main nginx configuration file:
```
C:\Users\rajes\Downloads\nginx-1.29.4\conf\nginx.conf
```

Find the section with server blocks (around line 40-50) and add this line before the closing brace:
```nginx
include broker-comparator.conf;
```

Or, add it after the default server block configuration.

**Example:**
```nginx
http {
    include mime.types;
    default_type application/octet-stream;

    # ... other configuration ...

    # Include our broker-comparator configuration
    include broker-comparator.conf;

    # You can keep the default server block or remove it
    # server {
    #     listen 80;
    #     server_name localhost;
    #     ...
    # }
}
```

## Step 4: Test nginx Configuration

Open PowerShell and navigate to the nginx directory:

```powershell
cd "C:\Users\rajes\Downloads\nginx-1.29.4"

# Test the configuration
.\nginx.exe -t
```

Expected output:
```
nginx: the configuration file C:\Users\rajes\Downloads\nginx-1.29.4/conf/nginx.conf syntax is ok
nginx: configuration file C:\Users\rajes\Downloads\nginx-1.29.4/conf/nginx.conf test is successful
```

## Step 5: Start/Restart nginx

### If nginx is not running:
```powershell
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe
```

### If nginx is already running (reload configuration):
```powershell
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe -s reload
```

### To stop nginx:
```powershell
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe -s stop
```

### To gracefully stop nginx:
```powershell
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe -s quit
```

## Step 6: Verify Deployment

### In PowerShell:
```powershell
# Check if nginx is running
Get-Process nginx

# Check if port 80 is listening
netstat -ano | findstr :80
```

### In Browser:
1. Open `http://localhost`
2. Verify the application loads
3. Open DevTools (F12)
4. Check **Console** tab for any errors
5. Check **Network** tab to verify API calls to backend

## Step 7: Verify API Connectivity

Test the backend API is reachable:

```powershell
# Check if backend is running
curl http://localhost:8000 -UseBasicParsing

# Or test specific endpoint
curl http://localhost:8000/cost-comparison-tables -UseBasicParsing
```

## Environment Configuration

The application uses environment variables from `.env.production`:

```
VITE_API_HOST=localhost
VITE_API_PORT=8000
VITE_API_PROTOCOL=http
```

**To change these values:**
1. Edit `.env.production`
2. Run `npm run build`
3. Reload nginx: `.\nginx.exe -s reload`

## Troubleshooting

### nginx won't start
```powershell
# Check detailed error messages
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe -t

# Check Windows Event Viewer for service errors
Get-EventLog -LogName System -Source Service -Newest 20
```

### Port 80 already in use
```powershell
# Find what's using port 80
netstat -ano | findstr :80

# Stop nginx and other services
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe -s stop

# Or change nginx to use a different port (edit broker-comparator.conf)
# Change: listen 80;
# To:     listen 8080;
```

### Application doesn't load
1. Check nginx error log: `C:\Users\rajes\Downloads\nginx-1.29.4\logs\error.log`
2. Check browser console (F12) for errors
3. Verify dist folder path in broker-comparator.conf matches your installation
4. Clear browser cache (Ctrl+Shift+Del) and hard refresh (Ctrl+Shift+R)

### API calls failing
1. Verify backend is running: `curl http://localhost:8000`
2. Check network tab in DevTools (F12)
3. Verify CORS is enabled on backend
4. Check broker-comparator.conf proxy configuration

### View nginx logs
```powershell
# View error log (last 50 lines)
Get-Content -Path "C:\Users\rajes\Downloads\nginx-1.29.4\logs\error.log" -Tail 50

# View access log (last 50 lines)
Get-Content -Path "C:\Users\rajes\Downloads\nginx-1.29.4\logs\access.log" -Tail 50
```

## Quick Start Script

Create a PowerShell script `start-local-dev.ps1`:

```powershell
# Navigate to nginx directory
cd "C:\Users\rajes\Downloads\nginx-1.29.4"

# Test configuration
Write-Host "Testing nginx configuration..." -ForegroundColor Yellow
.\nginx.exe -t

if ($LASTEXITCODE -eq 0) {
    # Kill existing nginx process if running
    Get-Process nginx -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start nginx
    Write-Host "Starting nginx..." -ForegroundColor Green
    Start-Process -FilePath ".\nginx.exe" -WindowStyle Hidden
    
    # Wait a moment for nginx to start
    Start-Sleep -Seconds 2
    
    # Open browser
    Write-Host "Opening http://localhost..." -ForegroundColor Green
    Start-Process "http://localhost"
} else {
    Write-Host "Configuration test failed!" -ForegroundColor Red
}
```

Run with:
```powershell
.\start-local-dev.ps1
```

## Rebuilding After Changes

When you make code changes:

```powershell
# In your project directory
npm run build

# Reload nginx without stopping
cd "C:\Users\rajes\Downloads\nginx-1.29.4"
.\nginx.exe -s reload

# Clear browser cache and refresh
# Ctrl+Shift+Del (clear cache)
# Ctrl+Shift+R (hard refresh)
```

## Port Configuration

To use a different port (e.g., 8080 instead of 80):

1. Edit `C:\Users\rajes\Downloads\nginx-1.29.4\conf\broker-comparator.conf`
2. Change `listen 80;` to `listen 8080;`
3. Save and reload: `.\nginx.exe -s reload`
4. Access at `http://localhost:8080`

## Common Commands

```powershell
# Navigate to nginx
cd "C:\Users\rajes\Downloads\nginx-1.29.4"

# Test config
.\nginx.exe -t

# Start nginx
.\nginx.exe

# Reload (graceful restart)
.\nginx.exe -s reload

# Stop immediately
.\nginx.exe -s stop

# Quit gracefully
.\nginx.exe -s quit

# Check if running
Get-Process nginx

# View error log
Get-Content -Path "logs\error.log" -Tail 20

# View access log
Get-Content -Path "logs\access.log" -Tail 20
```

## Configuration Paths

- **nginx executable**: `C:\Users\rajes\Downloads\nginx-1.29.4\nginx.exe`
- **Main config**: `C:\Users\rajes\Downloads\nginx-1.29.4\conf\nginx.conf`
- **App config**: `C:\Users\rajes\Downloads\nginx-1.29.4\conf\broker-comparator.conf`
- **Error log**: `C:\Users\rajes\Downloads\nginx-1.29.4\logs\error.log`
- **Access log**: `C:\Users\rajes\Downloads\nginx-1.29.4\logs\access.log`
- **Static files**: `C:\Users\rajes\PycharmProjects\ing-llm-testing\dist\`

## Support

- nginx logs location: `C:\Users\rajes\Downloads\nginx-1.29.4\logs\`
- Check both `error.log` and `access.log`
- Run `nginx -t` to validate configuration before starting
- Use DevTools (F12) to debug frontend issues

---

**Last Updated:** December 17, 2025
**Application:** Broker Fee Comparator
