# EC2 Deployment Quick Start

**TL;DR** - Deploy in 5 minutes

## Prerequisites
- EC2 instance (Ubuntu 22.04 LTS)
- SSH access
- Node.js 18+
- nginx installed

## Quick Deploy

```bash
# 1. SSH into your instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 2. Install basics (first time only)
sudo apt update && sudo apt install -y nodejs npm nginx git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs

# 3. Clone and build
cd ~
git clone YOUR_REPO broker-fee-comparator
cd broker-fee-comparator
npm install
npm run build

# 4. Setup nginx
sudo cp nginx.conf /etc/nginx/sites-available/broker-comparator
sudo ln -s /etc/nginx/sites-available/broker-comparator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl restart nginx

# 5. Access your app
# Go to: http://YOUR_EC2_IP
```

## Update Environment

Edit environment variables before building:
```bash
nano .env.production
# Change VITE_API_HOST if your backend is remote
npm run build
sudo systemctl reload nginx
```

## Health Check

```bash
# Check if nginx is running
sudo systemctl status nginx

# Check if application is accessible
curl http://localhost/

# View errors
sudo tail -f /var/log/nginx/broker-comparator-error.log
```

## Common Commands

```bash
# Rebuild and deploy
cd ~/broker-fee-comparator
git pull
npm install
npm run build
sudo systemctl reload nginx

# View logs
sudo tail -20 /var/log/nginx/broker-comparator-error.log
sudo tail -20 /var/log/nginx/broker-comparator-access.log

# Monitor resources
htop
df -h
free -h

# Restart nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# Check running processes
ps aux | grep nginx
ps aux | grep node
```

## Troubleshooting

**App not loading?**
```bash
sudo nginx -t  # Check config
sudo systemctl status nginx  # Check service
sudo tail -20 /var/log/nginx/broker-comparator-error.log  # Check errors
```

**Backend not connecting?**
```bash
curl http://localhost:8000  # Check if backend is running
curl -I http://localhost/  # Check if frontend loads
```

**Need to rebuild?**
```bash
cd ~/broker-fee-comparator
npm run build
sudo systemctl reload nginx
```

## SSL Setup (Optional)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
# Update /etc/nginx/sites-available/broker-comparator with SSL paths
sudo nginx -t && sudo systemctl reload nginx
```

## Info

- **Frontend**: `/home/ubuntu/broker-fee-comparator/dist/`
- **nginx config**: `/etc/nginx/sites-available/broker-comparator`
- **nginx logs**: `/var/log/nginx/broker-comparator-*.log`
- **Source**: `/home/ubuntu/broker-fee-comparator/`

## Full Guide

See `EC2_DEPLOYMENT.md` for detailed instructions.
