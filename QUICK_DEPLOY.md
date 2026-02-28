# Quick Deploy Reference

## To deploy your application to nginx, use one of these commands:

### Windows (PowerShell)
```powershell
# Deploy to custom nginx path
.\deploy-nginx.ps1 -DeployTarget custom -RemotePath 'C:\your\nginx\path'

# Deploy to remote server
.\deploy-nginx.ps1 -DeployTarget remote -RemoteHost 'user@server' -RemotePath '/home/ubuntu/broker-fee-comparator/dist'
```

### Linux/Mac (Bash)
```bash
# Deploy to custom nginx path
./deploy-nginx.sh custom /path/to/nginx/html

# Deploy to remote server
./deploy-nginx.sh remote user@server.com /home/ubuntu/broker-fee-comparator/dist
```

## What each command does:
1. ✅ Builds the latest code (`npm run build`)
2. ✅ Creates a backup of existing files
3. ✅ Copies new files to nginx
4. ✅ Provides restart instructions

## After deployment:
- Clear browser cache: `Ctrl+Shift+R`
- Restart nginx: `sudo systemctl restart nginx`
- Visit your server URL to see the changes

For full details, see: DEPLOYMENT.md
