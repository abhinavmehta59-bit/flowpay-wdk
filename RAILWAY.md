# FlowPay - Deploy to Railway

## Quick Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Railway deploy"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `flowpay-wdk` repo

3. **Add Environment Variables**
   In Railway dashboard → Variables, add:
   ```
   PIMLICO_API_KEY=pim_P6ybQm3U6Moep5zHaRshTX
   AGENT_SEED=prepare miss tissue soap unhappy same settle rug shoot protect soccer crowd
   NETWORK=arbitrum
   ```

4. **Deploy**
   Railway will auto-deploy. Your URL will be something like:
   `https://flowpay-production.up.railway.app`

## Features

- ✅ WDK Core (ERC-4337 smart wallets)
- ✅ MCP Toolkit (35 tools, 13 chains)
- ✅ x402 micropayments
- ✅ Express API + Web UI
- ✅ Arbitrum mainnet USDT

## API Endpoints

- `GET /api/status` - Health check
- `POST /api/wallet/create` - Create new wallet
- `POST /api/wallet/load` - Load from seed
- `GET /api/balance/:address` - Check balances
- `POST /api/send` - Send USDT gaslessly
- `POST /api/intent` - Natural language payments
- `GET /api/mcp/tools` - MCP toolkit status
- `POST /api/premium-intent` - x402 gated endpoint

## Hackathon

Built for Tether Galactica WDK Edition 1
Track: Agent Wallets
