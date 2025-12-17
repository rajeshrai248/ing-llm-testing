#!/bin/bash

# Broker Fee Comparator - EC2 Deployment Script
# This script automates the deployment process on EC2

set -e  # Exit on any error

echo "======================================"
echo "Broker Fee Comparator - Deployment"
echo "======================================"

# Configuration
REPO_PATH="${1:-.}"
DIST_PATH="$REPO_PATH/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Step 1: Verify node_modules exists
if [ ! -d "$REPO_PATH/node_modules" ]; then
    print_info "Installing npm dependencies..."
    cd "$REPO_PATH"
    npm install
    print_status "npm dependencies installed"
else
    print_status "npm dependencies already installed"
fi

# Step 2: Build the application
print_info "Building the application..."
cd "$REPO_PATH"
npm run build

if [ -d "$DIST_PATH" ]; then
    print_status "Application built successfully"
    
    # Show build size
    BUILD_SIZE=$(du -sh "$DIST_PATH" | cut -f1)
    print_info "Build size: $BUILD_SIZE"
else
    print_error "Build failed - dist folder not found"
    exit 1
fi

# Step 3: Check nginx
if command -v nginx &> /dev/null; then
    print_status "nginx is installed"
    
    # Test nginx configuration
    print_info "Testing nginx configuration..."
    if sudo nginx -t &>/dev/null; then
        print_status "nginx configuration is valid"
    else
        print_error "nginx configuration has errors"
        exit 1
    fi
    
    # Reload nginx
    print_info "Reloading nginx..."
    sudo systemctl reload nginx
    print_status "nginx reloaded successfully"
else
    print_error "nginx is not installed. Please install it with: sudo apt install nginx"
    exit 1
fi

# Step 4: Verify deployment
print_info "Verifying deployment..."
if [ -f "$DIST_PATH/index.html" ]; then
    print_status "Deployment verified - index.html found"
else
    print_error "Deployment verification failed - index.html not found"
    exit 1
fi

# Step 5: Show deployment summary
echo ""
echo "======================================"
echo "Deployment Summary"
echo "======================================"
print_status "Build completed successfully"
print_status "nginx configuration valid"
print_status "nginx reloaded"
print_status "Files ready to serve from: $DIST_PATH"
echo "======================================"
echo ""
print_info "Deployment complete! The application is now live."
print_info "Access it at: http://$(hostname -I | awk '{print $1}')"
echo ""
