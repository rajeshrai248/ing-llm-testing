# EC2 Deployment Checklist

## Pre-Deployment Checklist

### Local Setup
- [ ] All code changes committed to git
- [ ] Application builds successfully: `npm run build`
- [ ] No TypeScript errors: `npm run build` completes without errors
- [ ] Tested locally: `npm run dev`
- [ ] Environment variables configured in `.env.production`

### AWS EC2 Setup
- [ ] EC2 instance created and running (Ubuntu 22.04 LTS recommended)
- [ ] EC2 security group allows:
  - [ ] Port 80 (HTTP) from 0.0.0.0/0
  - [ ] Port 443 (HTTPS) from 0.0.0.0/0
  - [ ] Port 8000 (if backend on same instance) from 0.0.0.0/0
  - [ ] Port 22 (SSH) from your IP
- [ ] SSH key pair created and saved securely
- [ ] Elastic IP assigned (optional but recommended)

### Backend Preparation
- [ ] Backend API is running on port 8000
- [ ] Backend CORS is configured to accept requests from the EC2 instance
- [ ] Backend endpoints tested and working:
  - [ ] GET /cost-comparison-tables
  - [ ] GET /financial-analysis
  - [ ] POST /news/scrape

---

## Deployment Steps

### Step 1: Connect to EC2
- [ ] SSH into the instance: `ssh -i key.pem ubuntu@IP`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`

### Step 2: Install Dependencies
- [ ] Install Node.js 18+
- [ ] Install nginx
- [ ] Install git
- [ ] Verify installations with version commands

### Step 3: Deploy Application
- [ ] Clone repository: `git clone URL broker-fee-comparator`
- [ ] Navigate to directory: `cd broker-fee-comparator`
- [ ] Install npm dependencies: `npm install`
- [ ] Create `.env.production` file with correct API host
- [ ] Build application: `npm run build`
- [ ] Verify `dist/` folder created with files

### Step 4: Configure nginx
- [ ] Copy nginx config: `sudo cp nginx.conf /etc/nginx/sites-available/broker-comparator`
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/broker-comparator /etc/nginx/sites-enabled/`
- [ ] Remove default: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Test config: `sudo nginx -t` (should show OK)
- [ ] Start nginx: `sudo systemctl start nginx`
- [ ] Enable on boot: `sudo systemctl enable nginx`

### Step 5: Verify Deployment
- [ ] Check nginx is running: `sudo systemctl status nginx`
- [ ] Access application in browser: `http://EC2_IP`
- [ ] Page loads without errors
- [ ] Check browser console (F12) for JavaScript errors
- [ ] Test API calls in Network tab (F12)
- [ ] Try clicking on tables and analysis tabs
- [ ] Verify tooltips and interactive features work

### Step 6: SSL/HTTPS Setup (Recommended for Production)
- [ ] Install certbot: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] Get certificate: `sudo certbot certonly --nginx -d your-domain.com`
- [ ] Update nginx config with SSL paths
- [ ] Test config: `sudo nginx -t`
- [ ] Reload nginx: `sudo systemctl reload nginx`
- [ ] Verify HTTPS works: `https://your-domain.com`

### Step 7: Monitoring & Logs
- [ ] Check nginx access log: `sudo tail -f /var/log/nginx/broker-comparator-access.log`
- [ ] Check nginx error log: `sudo tail -f /var/log/nginx/broker-comparator-error.log`
- [ ] Monitor server resources: `top` or `htop`
- [ ] Check disk space: `df -h`

---

## Post-Deployment Verification

### Functionality Tests
- [ ] Homepage loads correctly
- [ ] Tables tab displays broker comparison tables
- [ ] Analysis tab displays financial analysis
- [ ] Tooltips show on hover (comparison tables)
- [ ] Cost tooltips show on hover (annual cost simulation)
- [ ] Cheapest per tier section visible
- [ ] Broker ratings cards display correctly
- [ ] All links work and don't have 404 errors

### Performance Checks
- [ ] Page loads within 3 seconds
- [ ] CSS and JS files are minified
- [ ] Images are optimized
- [ ] No console errors in DevTools (F12)
- [ ] Network requests show 200 status codes

### API Integration
- [ ] API calls to backend succeed (200 status)
- [ ] Response data displays correctly
- [ ] Error handling works (test with backend offline)
- [ ] CORS headers are correct

### Security Checks
- [ ] Security headers present in response
- [ ] .env file not accessible via web
- [ ] Hidden files (.*) not served
- [ ] nginx errors show no sensitive info

---

## Common Issues & Solutions

### Application not loading
- [ ] Check nginx logs: `sudo tail -f /var/log/nginx/broker-comparator-error.log`
- [ ] Verify dist folder exists: `ls -la dist/`
- [ ] Check nginx config syntax: `sudo nginx -t`
- [ ] Verify permissions: `ls -la /home/ubuntu/broker-fee-comparator/dist/`

### API requests failing
- [ ] Verify backend is running: `curl http://localhost:8000`
- [ ] Check backend logs for errors
- [ ] Verify CORS headers in backend response
- [ ] Check security group allows traffic to port 8000
- [ ] Verify API_HOST environment variable is correct

### SSL certificate issues
- [ ] Verify domain DNS points to EC2 IP
- [ ] Check certificate files exist: `ls -la /etc/letsencrypt/live/`
- [ ] Verify certificate not expired: `sudo certbot certificates`
- [ ] Check nginx SSL configuration syntax

### Performance issues
- [ ] Check server resource usage: `free -h`, `df -h`
- [ ] Check nginx worker processes: `ps aux | grep nginx`
- [ ] Verify gzip compression is enabled
- [ ] Consider scaling to larger instance type

---

## Maintenance Tasks

### Regular Updates
- [ ] Check for security updates: `sudo apt list --upgradable`
- [ ] Apply updates: `sudo apt update && sudo apt upgrade`
- [ ] Restart services if needed: `sudo systemctl restart nginx`

### Backup & Recovery
- [ ] Backup nginx config: `sudo tar czf nginx-backup.tar.gz /etc/nginx/`
- [ ] Backup application: `tar czf app-backup.tar.gz /home/ubuntu/broker-fee-comparator/`
- [ ] Store backups securely (S3, GitHub, etc.)

### Monitoring
- [ ] Set up CloudWatch alarms for:
  - [ ] High CPU usage
  - [ ] High memory usage
  - [ ] Disk space low
- [ ] Configure log rotation
- [ ] Set up error alerts (Sentry, etc.)

### Redeployment
- [ ] Pull latest code: `cd /home/ubuntu/broker-fee-comparator && git pull`
- [ ] Rebuild app: `npm install && npm run build`
- [ ] Reload nginx: `sudo systemctl reload nginx`
- [ ] Verify in browser

---

## Rollback Procedure

If deployment fails:
1. `cd /home/ubuntu/broker-fee-comparator`
2. `git log --oneline` (find previous good commit)
3. `git checkout COMMIT_HASH`
4. `npm install && npm run build`
5. `sudo systemctl reload nginx`

---

## Getting Help

### Debugging Commands
```bash
# Check nginx status
sudo systemctl status nginx

# View nginx error log
sudo tail -100 /var/log/nginx/broker-comparator-error.log

# View nginx access log
sudo tail -100 /var/log/nginx/broker-comparator-access.log

# Check if port is listening
sudo netstat -tlnp | grep :80

# Test backend connection
curl -v http://localhost:8000

# Check disk space
df -h

# Check memory usage
free -h

# Restart nginx
sudo systemctl restart nginx

# Reload nginx (graceful)
sudo systemctl reload nginx
```

---

**Last Updated:** December 17, 2025
**Application:** Broker Fee Comparator
**Version:** 0.0.0
