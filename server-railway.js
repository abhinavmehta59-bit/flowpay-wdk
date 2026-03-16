/**
 * FlowPay — Minimal Railway Version
 * Uses only public packages
 */

import 'dotenv/config'
import express from 'express'
import { createPublicClient, http, formatUnits } from 'viem'
import { arbitrum } from 'viem/chains'

const app = express()
app.use(express.json())
app.use(express.static('public'))

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc'
const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'

const arbitrumClient = createPublicClient({ chain: arbitrum, transport: http(ARBITRUM_RPC) })

const SMART_WALLET = process.env.AGENT_SMART_WALLET || '0x63210adB0207Db49404A219583471576566faD59'

// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/api/status', (_, res) => {
  res.json({ 
    ok: true, 
    walletLoaded: true, 
    network: 'arbitrum', 
    token: 'USDT',
    smartWallet: SMART_WALLET,
    message: 'FlowPay Railway - Minimal Mode (WDK packages not available on Railway)'
  })
})

app.get('/api/balance/:address', async (req, res) => {
  try {
    const addr = req.params.address
    const ethBal = await arbitrumClient.getBalance({ address: addr })
    res.json({ 
      ETH: formatUnits(ethBal, 18), 
      USDT: '2.41', // Static for demo
      network: 'arbitrum',
      note: 'Balance read-only on Railway (WDK not available)'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/send', async (req, res) => {
  res.json({ 
    error: 'Send disabled on Railway deployment',
    message: 'WDK packages require authentication. Use local deployment for full features.',
    localUrl: 'http://localhost:3456'
  })
})

app.post('/api/intent', async (req, res) => {
  res.json({ 
    error: 'Intent parsing disabled on Railway',
    message: 'WDK packages require authentication. Use local deployment for full features.',
    localUrl: 'http://localhost:3456'
  })
})

app.get('/api/mcp/tools', (_, res) => {
  res.json({ 
    available: false, 
    message: 'MCP Toolkit requires WDK authentication',
    chains: 13, 
    tools: 35,
    note: 'Available on local deployment only'
  })
})

const PORT = process.env.PORT || 3456
app.listen(PORT, () => {
  console.log(`FlowPay Railway (Minimal) running on port ${PORT}`)
  console.log(`Smart Wallet: ${SMART_WALLET}`)
})
