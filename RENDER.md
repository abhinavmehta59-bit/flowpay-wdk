# FlowPay - Render Deployment Guide

## Prerequisites

You need a Render account: https://render.com

## Deployment Steps

### 1. Create New Web Service
- Go to https://dashboard.render.com
- Click "New +" → "Web Service"
- Connect your GitHub repo: `abhinavmehta59-bit/flowpay-wdk`

### 2. Configure Build
Render will auto-detect Node.js. Use these settings:

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node server-enhanced.js
```

### 3. Environment Variables
Add these in Render Dashboard → Environment:

```
PIMLICO_API_KEY=pim_P6ybQm3U6Moep5zHaRshTX
AGENT_SEED=prepare miss tissue soap unhappy same settle rug shoot protect soccer crowd
NETWORK=arbitrum
```

### 4. Deploy
Click "Create Web Service"

Render will:
1. Install all npm packages (including WDK)
2. Build the app
3. Start the server
4. Give you a URL like `https://flowpay.onrender.com`

## Troubleshooting

If WDK packages fail to install:
1. Check Render's Node version (should be 18+)
2. Try clearing build cache and redeploying
3. Contact Tether for npm access if needed

## Features

Full deployment includes:
- ✅ WDK Core (ERC-4337 smart wallets)
- ✅ MCP Toolkit (35 tools, 13 chains)
- ✅ x402 micropayments
- ✅ Gasless USDT transfers
- ✅ Natural language intents
