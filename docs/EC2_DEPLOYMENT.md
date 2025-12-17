# EC2 Deployment Guide - Broker Fee Comparator

This guide walks you through deploying the Broker Fee Comparator frontend application to AWS EC2.

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- Node.js 18+ installed on the instance
- nginx installed for serving the static files
- Backend API running on port 8000 (same instance or different)
- SSH access to your EC2 instance

## Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 2: Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install git (if not already installed)
sudo apt install -y git

# Verify installations
node --version
npm --version
nginx -v
```

## Step 3: Clone the Repository

```bash
cd /home/ubuntu
git clone <your-repository-url> broker-fee-comparator
cd broker-fee-comparator
```

## Step 4: Install npm Dependencies

```bash
npm install
```

## Step 5: Build the Application

```bash
# Build the production-ready static files
npm run build
```

This creates a `dist/` directory with optimized static files.

## Step 6: Configure Environment Variables

Create a `.env.production` file in the root directory:

```bash
# If backend is on the same instance, leave VITE_API_HOST empty (auto-detect)
# Or specify your backend API server address
VITE_API_HOST=localhost
VITE_API_PORT=8000
VITE_API_PROTOCOL=http

# For a different server:
# VITE_API_HOST=backend.example.com
# VITE_API_PORT=8000
# VITE_API_PROTOCOL=https
```

**Important:** Rebuild after changing environment variables:
```bash
npm run build
```

## Step 7: Configure nginx

Create/update nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/broker-comparator
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name _;  # Replace with your domain or IP

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Serve static files from the dist directory
    location / {
        root /home/ubuntu/broker-fee-comparator/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Cache assets with long expiry
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/ubuntu/broker-fee-comparator/dist;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/broker-comparator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site if present
```

## Step 8: Test and Start nginx

```bash
# Test nginx configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Step 9: Deploy (Using GitHub)

For automated deployments, create a deployment script:

```bash
nano ~/deploy.sh
```

```bash
#!/bin/bash
cd /home/ubuntu/broker-fee-comparator
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x ~/deploy.sh
```

## Step 10: SSL/HTTPS Setup (Optional but Recommended)

Using Let's Encrypt with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d your-domain.com

# Update nginx to use SSL
sudo nano /etc/nginx/sites-available/broker-comparator
```

Add SSL configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Reload nginx:
```bash
sudo systemctl reload nginx
```

## Step 11: Verify Deployment

1. Open your browser and navigate to `http://your-ec2-public-ip` (or your domain)
2. Check the browser console (F12) for any errors
3. Verify API calls are working by checking the Network tab in DevTools
4. Test different pages and features

## Troubleshooting

### Check nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check if ports are open:
```bash
# Check if port 80 is listening
sudo netstat -tlnp | grep :80

# Check if backend is accessible
curl http://localhost:8000/health
```

### Rebuild if changes made:
```bash
cd /home/ubuntu/broker-fee-comparator
npm run build
sudo systemctl reload nginx
```

## Environment Variable Configuration

### For Local Backend (Same Instance)
```env
VITE_API_HOST=localhost
VITE_API_PORT=8000
VITE_API_PROTOCOL=http
```

### For Remote Backend
```env
VITE_API_HOST=backend.example.com
VITE_API_PORT=8000
VITE_API_PROTOCOL=https
```

### Auto-detect (If Backend on Same Instance)
```env
# Leave VITE_API_HOST empty - the app will auto-detect the hostname
VITE_API_PORT=8000
VITE_API_PROTOCOL=http
```

## Performance Optimization

The deployment includes:
- **Gzip compression** - Reduces file sizes by 60-80%
- **Browser caching** - Static assets cached for 30 days
- **CSS/JS minification** - Done by Vite during build
- **Image optimization** - Consider optimizing images separately

## Security Considerations

1. **Keep EC2 security group updated** - Only allow ports 80/443
2. **Enable nginx security headers** - Already configured in the nginx setup
3. **Monitor API backend** - Ensure CORS is properly configured
4. **Use HTTPS in production** - Follow SSL/HTTPS setup above
5. **Regular backups** - Back up your repository and configuration

## Monitoring

Consider setting up:
- CloudWatch monitoring for EC2 instance
- nginx access/error logs monitoring
- Application error tracking (e.g., Sentry)

## Maintenance

### Update the Application
```bash
cd /home/ubuntu/broker-fee-comparator
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

### Monitor Disk Space
```bash
df -h
```

### Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

## Support

For issues or questions:
1. Check the logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify backend connectivity: `curl http://localhost:8000`
3. Clear browser cache and do a hard refresh
4. Check EC2 security group rules

---

**Last Updated:** December 17, 2025
**Application:** Broker Fee Comparator
**Version:** 0.0.0
