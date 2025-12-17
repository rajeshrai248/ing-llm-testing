# Network Access Configuration

## Running the App on Network

The app now supports accessing from other machines on your network.

### Quick Start

1. **Start your backend API** (port 8000):
   ```bash
   python scripts/run_api.py
   # or your backend command
   ```

2. **Start the React app with network access**:
   ```bash
   npm run dev -- --host
   ```

3. **Access from another machine**:
   - Find your machine's IP address:
     - Windows: `ipconfig` (look for IPv4 Address)
     - Mac/Linux: `ifconfig` or `hostname -I`
   - Access the app at: `http://<YOUR_IP>:5173`
   - The app will automatically make API calls to `http://<YOUR_IP>:8000`

### Configuration Options

If the automatic detection doesn't work, you can configure the API endpoint manually:

#### Option 1: Using Environment Variables (.env.local)

Create a `.env.local` file in the project root:

```env
# For a specific API server address
VITE_API_HOST=192.168.1.100
VITE_API_PORT=8000
VITE_API_PROTOCOL=http

# Or leave VITE_API_HOST empty to auto-detect based on current hostname
VITE_API_HOST=
VITE_API_PORT=8000
VITE_API_PROTOCOL=http
```

Then restart the dev server:
```bash
npm run dev -- --host
```

#### Option 2: Network Setup with Fixed IP

If your machine has a fixed IP on the network:

```env
VITE_API_HOST=192.168.1.50
VITE_API_PORT=8000
VITE_API_PROTOCOL=http
```

### Troubleshooting

**Issue**: "Failed to fetch from http://localhost:8000"
- **Cause**: API endpoint resolved to localhost instead of actual hostname
- **Solution**: Check `.env.local` configuration or manually set `VITE_API_HOST` to your machine's IP

**Issue**: "CORS error" or "Blocked by browser"
- **Cause**: API server doesn't have CORS headers properly configured
- **Solution**: Ensure your backend API includes these headers:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  ```

**Issue**: Can access app but API calls fail
- **Cause**: Firewall blocking port 8000
- **Solution**: 
  - Allow port 8000 through Windows Firewall
  - Or configure your firewall rules to allow connections to port 8000

### Network Access Patterns

```
Local Development:
Client (localhost:5173) -> API (localhost:8000)
✓ Works automatically

Network Access:
Client (192.168.1.100:5173) -> API (192.168.1.100:8000)
✓ Works with auto-detection

Multi-Machine Setup:
Client Machine A (192.168.1.50:5173) -> API Machine B (192.168.1.100:8000)
✓ Requires VITE_API_HOST=192.168.1.100 in .env.local on Machine A
```

### Example Setups

#### Setup 1: All on Same Machine (Development)
```bash
# Terminal 1: API Server
python scripts/run_api.py

# Terminal 2: React App
npm run dev -- --host
```
Access: `http://192.168.1.50:5173` (replace with your IP)

#### Setup 2: API on One Machine, React on Another
```bash
# Machine A (192.168.1.100) - Backend API
python scripts/run_api.py

# Machine B (192.168.1.50) - React App
# In .env.local:
# VITE_API_HOST=192.168.1.100
npm run dev -- --host
```
Access on Machine B: `http://192.168.1.50:5173`

#### Setup 3: Remote Server
```bash
# Remote Server - Backend API
python scripts/run_api.py

# Local Machine - React App
# In .env.local:
# VITE_API_HOST=api.yourdomain.com
# VITE_API_PROTOCOL=https
npm run dev -- --host
```
Access: `http://localhost:5173` and it will call `https://api.yourdomain.com:8000`

### Security Considerations

When exposing on network:

1. **Enable Authentication** on your API server
2. **Use HTTPS** for remote access (set `VITE_API_PROTOCOL=https`)
3. **Configure Firewall** to restrict which machines can access
4. **Rate Limiting** on API endpoints
5. **Input Validation** on all API calls

### Production Deployment

For production:
1. Build the app: `npm run build`
2. Use a reverse proxy (Nginx, Apache) to serve both React and API
3. Configure proper CORS headers on API server
4. Use HTTPS with valid certificates
5. Implement authentication/authorization
6. Set `VITE_API_HOST` to your production domain
