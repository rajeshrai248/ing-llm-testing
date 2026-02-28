# Nginx Deployment Guide

## Overview
Your application is now ready to deploy to nginx. Two deployment scripts have been created for different scenarios.

## Scripts Available

### 1. Windows Deployment: `deploy-nginx.ps1`
PowerShell script for Windows systems.

#### Local Deployment (if nginx is installed locally)
```powershell
.\deploy-nginx.ps1 -DeployTarget local
```

#### Custom Path Deployment
```powershell
.\deploy-nginx.ps1 -DeployTarget custom -RemotePath 'C:\path\to\nginx\html'
```

#### Remote Server Deployment (via SSH/SCP)
```powershell
.\deploy-nginx.ps1 -DeployTarget remote -RemoteHost 'username@your-server.com' -RemotePath '/home/ubuntu/broker-fee-comparator/dist'
```

### 2. Linux/Mac Deployment: `deploy-nginx.sh`
Bash script for Linux and Mac systems.

#### Local Deployment
```bash
chmod +x deploy-nginx.sh
./deploy-nginx.sh local
```

#### Custom Path Deployment
```bash
./deploy-nginx.sh custom /path/to/nginx/html
```

#### Remote Server Deployment
```bash
./deploy-nginx.sh remote username@your-server.com /home/ubuntu/broker-fee-comparator/dist
```

## Nginx Configuration
The nginx configuration file is provided: [nginx.conf](nginx.conf)

To use it on your server:
1. Copy `nginx.conf` to `/etc/nginx/sites-available/broker-comparator`
2. Enable the site: `sudo ln -s /etc/nginx/sites-available/broker-comparator /etc/nginx/sites-enabled/`
3. Test nginx: `sudo nginx -t`
4. Reload nginx: `sudo systemctl reload nginx`

## Build Output Location
The compiled application is located in: `./dist/`

This contains:
- `index.html` - Main HTML file
- `assets/` - CSS and JavaScript bundles

## After Deployment

1. **Clear Browser Cache**: Clear your browser cache with `Ctrl+Shift+R` or `Cmd+Shift+R`
2. **Verify Deployment**: Visit your nginx server URL to see the updated application
3. **Restart Nginx** (if needed):
   ```bash
   sudo systemctl restart nginx
   # or
   sudo service nginx restart
   ```

## Server Requirements

- **Nginx**: Latest stable version (1.20+)
- **Node.js**: 16+ (for building locally)
- **Disk Space**: ~250MB for complete installation
- **Port**: 80 (HTTP) or 443 (HTTPS with SSL)

## Features

The deployment scripts automatically:
- ✅ Build the project from source
- ✅ Backup existing deployment files
- ✅ Handle both local and remote deployments
- ✅ Support custom deployment paths
- ✅ Create timestamped backups for rollback

## SSL/HTTPS Setup

For production deployments, uncomment the SSL section in nginx.conf and:
1. Obtain an SSL certificate (e.g., Let's Encrypt)
2. Update the certificate paths in nginx.conf
3. Restart nginx

## Troubleshooting

**Build Fails:**
- Ensure Node.js 16+ is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

**Deployment Fails:**
- For remote deployment, ensure SSH key is configured
- Verify nginx directory permissions: `ls -la /home/ubuntu/broker-fee-comparator/`
- Check nginx error logs: `tail -f /var/log/nginx/broker-comparator-error.log`

**Page Not Loading:**
- Clear browser cache (Ctrl+Shift+R)
- Check nginx is running: `sudo systemctl status nginx`
- Verify DNS/IP address is correct
- Check nginx access logs: `tail -f /var/log/nginx/broker-comparator-access.log`

## Support
For additional help with nginx configuration, visit: https://nginx.org/en/docs/
