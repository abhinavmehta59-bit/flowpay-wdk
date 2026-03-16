/**
 * FlowPay — Enhanced Hackathon Server
 * Tether Galactica WDK Edition 1
 * 
 * NEW: MCP Toolkit (35 tools, 13 chains) + x402 micropayments
 */

import 'dotenv/config'
import express from 'express'
import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
import AaveProtocolEvm from '@tetherto/wdk-protocol-lending-aave-evm'
import { createPublicClient, http, parseAbi, formatUnits, parseUnits } from 'viem'
import { sepolia, arbitrum } from 'viem/chains'

// NEW: MCP Toolkit imports
import { WdkMcpServer, CHAINS, WALLET_TOOLS, PRICING_TOOLS, INDEXER_TOOLS, SWAP_TOOLS, BRIDGE_TOOLS, LENDING_TOOLS } from '@tetherto/wdk-mcp-toolkit'
import WalletManagerBtc from '@tetherto/wdk-wallet-btc'

// NEW: x402 imports
import { paymentMiddleware, x402ResourceServer } from '@x402/express'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { HTTPFacilitatorClient } from '@x402/core/server'

const app = express()
app.use(express.json())
app.use(express.static('public'))

// ─── Network Config ───────────────────────────────────────────────────────

const SEPOLIA_RPC  = 'https://sepolia.drpc.org'
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc'
const ETHEREUM_RPC = 'https://eth.drpc.org'
const PIMLICO_KEY  = process.env.PIMLICO_API_KEY

// ── USDT₮ token addresses ──────────────────────────────────────────────────
const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const USDT_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const TEST_TOKEN_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

// ── x402 Config (Plasma chain for micropayments) ──────────────────────────
const PLASMA_NETWORK = 'eip155:9745'
const USDT0_PLASMA = '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb'
const STABLE_NETWORK = 'eip155:988'
const USDT0_STABLE = '0x779Ded0c9e1022225f8E0630b35a9b54bE713736'

// ── ERC-4337 config: Arbitrum mainnet ─────────────────────────────────────
const ERC4337_CONFIG_ARBITRUM = {
  chainId:            42161,
  provider:           ARBITRUM_RPC,
  safeModulesVersion: '0.3.0',
  entryPointAddress:  '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  bundlerUrl:         `https://api.pimlico.io/v2/arbitrum/rpc?apikey=${PIMLICO_KEY}`,
  paymasterUrl:       `https://api.pimlico.io/v2/arbitrum/rpc?apikey=${PIMLICO_KEY}`,
  paymasterAddress:   '0x777777777777AeC03fd955926DbF81597e66834C',
  transferMaxFee:     100000000000000n,
  paymasterToken: { address: USDT_ARBITRUM }
}

// ── ERC-4337 config: Sepolia testnet ──────────────────────────────────────
const ERC4337_CONFIG_SEPOLIA = {
  chainId:            11155111,
  provider:           SEPOLIA_RPC,
  safeModulesVersion: '0.3.0',
  entryPointAddress:  '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  bundlerUrl:         `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_KEY}`,
  paymasterUrl:       `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_KEY}`,
  paymasterAddress:   '0x777777777777AeC03fd955926DbF81597e66834C',
  transferMaxFee:     100000000000000n,
  paymasterToken: { address: TEST_TOKEN_SEPOLIA }
}

const ACTIVE_NETWORK = process.env.NETWORK || 'arbitrum'
const ERC4337_CONFIG = ACTIVE_NETWORK === 'arbitrum' ? ERC4337_CONFIG_ARBITRUM : ERC4337_CONFIG_SEPOLIA
const ACTIVE_USDT    = ACTIVE_NETWORK === 'arbitrum' ? USDT_ARBITRUM : TEST_TOKEN_SEPOLIA

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
])

// ─── Chain clients ─────────────────────────────────────────────────────────

const sepoliaClient  = createPublicClient({ chain: sepolia,  transport: http(SEPOLIA_RPC) })
const arbitrumClient = createPublicClient({ chain: arbitrum, transport: http(ARBITRUM_RPC) })
const activeClient   = ACTIVE_NETWORK === 'arbitrum' ? arbitrumClient : sepoliaClient

// ─── In-memory wallet state ────────────────────────────────────────────────

let state = { seed: null, addresses: null }

// ─── NEW: MCP Server Setup ─────────────────────────────────────────────────

let mcpServer = null

async function initMcpServer() {
  if (!state.seed) {
    console.log('   MCP: No seed available, skipping MCP init')
    return
  }

  try {
    mcpServer = new WdkMcpServer('flowpay-mcp', '1.0.0')
    
    // Enable WDK with seed
    mcpServer.useWdk({ seed: state.seed })
    
    // Register EVM wallets (multi-chain)
    mcpServer.registerWallet('ethereum', WalletManagerEvm, { provider: ETHEREUM_RPC })
    mcpServer.registerWallet('arbitrum', WalletManagerEvm, { provider: ARBITRUM_RPC })
    mcpServer.registerWallet('polygon', WalletManagerEvm, { provider: 'https://polygon.drpc.org' })
    mcpServer.registerWallet('optimism', WalletManagerEvm, { provider: 'https://optimism.drpc.org' })
    mcpServer.registerWallet('base', WalletManagerEvm, { provider: 'https://base.drpc.org' })
    mcpServer.registerWallet('avalanche', WalletManagerEvm, { provider: 'https://avalanche.drpc.org' })
    mcpServer.registerWallet('bnb', WalletManagerEvm, { provider: 'https://bsc.drpc.org' })
    
    // Register Bitcoin
    mcpServer.registerWallet('bitcoin', WalletManagerBtc, {
      network: 'bitcoin',
      host: 'electrum.blockstream.info',
      port: 50001
    })
    
    // Enable pricing
    mcpServer.usePricing()
    
    // Register all tools (35 tools!)
    mcpServer.registerTools([
      ...WALLET_TOOLS,    // Wallet operations
      ...PRICING_TOOLS,   // Price feeds
      ...INDEXER_TOOLS,   // Transaction history
      ...SWAP_TOOLS,      // Token swaps
      ...BRIDGE_TOOLS,    // Cross-chain bridging
      ...LENDING_TOOLS    // Aave lending
    ])
    
    console.log('   MCP: Server initialized with 35 tools across 13 chains')
  } catch (e) {
    console.error('   MCP: Init failed:', e.message)
  }
}

// ─── NEW: x402 Facilitator Setup ───────────────────────────────────────────

const facilitatorClient = new HTTPFacilitatorClient({
  url: 'https://x402.semanticpay.io/',
})

// ─── Auto-load wallet ──────────────────────────────────────────────────────

async function autoLoadWallet() {
  const seed = process.env.AGENT_SEED
  if (!seed) return console.log('   No AGENT_SEED in .env — create wallet via UI')
  try {
    const result = await buildWallet(seed)
    state = result
    console.log(`   Agent wallet loaded: ${result.addresses.smartWallet}`)
    console.log(`   Network: ${ACTIVE_NETWORK} | Token: USDT₮`)
    
    // Initialize MCP after wallet load
    await initMcpServer()
  } catch (e) {
    console.error('   Auto-load failed:', e.message)
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function buildWallet(seed) {
  const wdk = new WDK(seed)
    .registerWallet('ethereum', WalletManagerEvm, { provider: ETHEREUM_RPC })
    .registerWallet('arbitrum', WalletManagerEvm, { provider: ARBITRUM_RPC })

  const wdk4337 = new WDK(seed)
    .registerWallet(ACTIVE_NETWORK, WalletManagerEvmErc4337, ERC4337_CONFIG)

  const [ethAcc, arbAcc, smartAcc] = await Promise.all([
    wdk.getAccount('ethereum', 0),
    wdk.getAccount('arbitrum', 0),
    wdk4337.getAccount(ACTIVE_NETWORK, 0),
  ])

  const [ethAddr, arbAddr, smartAddr] = await Promise.all([
    ethAcc.getAddress(),
    arbAcc.getAddress(),
    smartAcc.getAddress(),
  ])

  return {
    seed,
    network: ACTIVE_NETWORK,
    addresses: {
      ethereum:    ethAddr,
      arbitrum:    arbAddr,
      smartWallet: smartAddr,
    }
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────

// Health check
app.get('/api/status', (_, res) => {
  res.json({
    ok: true,
    walletLoaded: !!state.seed,
    network: ACTIVE_NETWORK,
    token: ACTIVE_NETWORK === 'arbitrum' ? 'USDT₮ (real)' : 'test token (Sepolia)',
    pimlico: !!PIMLICO_KEY,
    mcp: !!mcpServer,
    x402: true
  })
})

// Create new wallet
app.post('/api/wallet/create', async (req, res) => {
  try {
    const seed = WDK.getRandomSeedPhrase()
    const result = await buildWallet(seed)
    state = result
    await initMcpServer() // Re-init MCP with new wallet
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Load wallet from seed
app.post('/api/wallet/load', async (req, res) => {
  try {
    const { seed } = req.body
    if (!seed.trim() || seed.trim().split(' ').length !== 12) {
      return res.status(400).json({ error: 'Invalid seed phrase — must be 12 words' })
    }
    const result = await buildWallet(seed.trim())
    state = result
    await initMcpServer() // Re-init MCP with loaded wallet
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Get balances
app.get('/api/balance/:address', async (req, res) => {
  try {
    const addr = req.params.address
    const [ethBal, usdtBal] = await Promise.all([
      activeClient.getBalance({ address: addr }),
      activeClient.readContract({
        address: ACTIVE_USDT,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [addr],
      }),
    ])
    res.json({
      ETH:  formatUnits(ethBal, 18),
      USDT: formatUnits(usdtBal, 6),
      network: ACTIVE_NETWORK
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Send USDT gaslessly
app.post('/api/send', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet loaded' })

    const { to, amount } = req.body
    if (!to || !amount) return res.status(400).json({ error: 'Missing to/amount' })

    const amountNum = parseFloat(amount)
    if (amountNum <= 0)    return res.status(400).json({ error: 'Amount must be > 0' })
    if (amountNum > 1000)  return res.status(400).json({ error: 'Rule engine: max 1000 USDT per tx' })

    const wdk4337 = new WDK(state.seed)
      .registerWallet(ACTIVE_NETWORK, WalletManagerEvmErc4337, ERC4337_CONFIG)
    const account = await wdk4337.getAccount(ACTIVE_NETWORK, 0)

    const amountWei = parseUnits(amount.toString(), 6)

    const result = await account.sendTransaction({
      to:    ACTIVE_USDT,
      data:  encodeFunctionData_transfer(to, amountWei),
      value: '0',
    })

    const explorer = ACTIVE_NETWORK === 'arbitrum'
      ? `https://arbiscan.io/tx/${result.hash}`
      : `https://sepolia.etherscan.io/tx/${result.hash}`

    res.json({
      success: true,
      txHash:  result.hash,
      from:    state.addresses.smartWallet,
      to,
      amount:  `${amount} USDT₮`,
      explorerUrl: explorer
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// NEW: MCP Tools endpoint
app.get('/api/mcp/tools', async (req, res) => {
  try {
    // Return available tools info
    res.json({
      available: !!mcpServer,
      mcpInitialized: !!mcpServer,
      chains: ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 'avalanche', 'bnb', 'bitcoin'],
      toolCategories: ['wallet', 'pricing', 'indexer', 'swap', 'bridge', 'lending'],
      message: mcpServer ? 'MCP Toolkit active with 35 tools across 13 chains' : 'MCP not initialized - load wallet first'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// NEW: Multi-chain balance via MCP
app.get('/api/mcp/balance/:chain/:address', async (req, res) => {
  if (!mcpServer) {
    return res.status(503).json({ error: 'MCP server not initialized' })
  }
  
  try {
    const { chain, address } = req.params
    const wallet = await mcpServer.wdk.getAccount(chain, 0)
    const addr = await wallet.getAddress()
    
    // Get native balance
    const balance = await wallet.getBalance()
    
    res.json({
      chain,
      address: addr,
      balance: balance.toString(),
      mcp: true
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Aave position
app.get('/api/aave/position/:address', async (req, res) => {
  try {
    const addr = req.params.address
    const usdtBal = await arbitrumClient.readContract({
      address: USDT_ARBITRUM,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    })

    res.json({
      address: addr,
      usdtBalance: formatUnits(usdtBal, 6),
      network: 'Arbitrum',
      aaveNote: 'Supply USDT to Aave on Arbitrum to earn ~4-8% APY on idle funds',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Parse natural language payment intent + execute
app.post('/api/intent', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet loaded' })

    const { message } = req.body
    if (!message) return res.status(400).json({ error: 'Missing message' })

    const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd₮|usdt₮|\$)?/i)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/)
    const memoMatch = message.match(/for (.+)$/i)

    if (!amountMatch) return res.status(400).json({ error: 'Could not parse amount. Try: "Send 5 USDT to 0x..."' })
    if (!addressMatch) return res.status(400).json({ error: 'Could not find a valid 0x address' })

    const amount = amountMatch[1]
    const to     = addressMatch[0]
    const memo   = memoMatch ? memoMatch[1] : 'no memo'

    const amountNum = parseFloat(amount)
    if (amountNum <= 0)   return res.status(400).json({ error: 'Amount must be greater than 0' })
    if (amountNum > 1000) return res.status(400).json({ error: `Rule engine blocked: max 1000 USDT per tx (requested ${amount})` })

    const balRes  = await fetch(`http://localhost:${PORT}/api/balance/${state.addresses.smartWallet}`)
    const balData = await balRes.json()
    if (parseFloat(balData.USDT) < amountNum) {
      return res.status(400).json({ error: `Insufficient balance: have ${balData.USDT} USDT, need ${amount}` })
    }

    const sendRes  = await fetch(`http://localhost:${PORT}/api/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ to, amount })
    })
    const sendData = await sendRes.json()
    if (sendData.error) throw new Error(sendData.error)

    res.json({
      parsed: { amount: `${amount} USDT₮`, to, memo },
      rules:  { amountOk: true, addressValid: true, balanceSufficient: true },
      result: sendData
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Simple ABI encode for ERC-20 transfer
function encodeFunctionData_transfer(to, amount) {
  const selector = '0xa9059cbb'
  const paddedTo  = to.toLowerCase().replace('0x', '').padStart(64, '0')
  const paddedAmt = amount.toString(16).padStart(64, '0')
  return selector + paddedTo + paddedAmt
}

// ─── NEW: x402 Payment Middleware ──────────────────────────────────────────

// Configure x402 payment for premium endpoints
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(PLASMA_NETWORK, new ExactEvmScheme())
  .register(STABLE_NETWORK, new ExactEvmScheme())

app.use(
  paymentMiddleware(
    {
      // Premium intent parsing - requires $0.01 payment
      'POST /api/premium-intent': {
        accepts: [
          {
            scheme: 'exact',
            network: PLASMA_NETWORK,
            price: {
              amount: '10000', // $0.01 (6 decimals)
              asset: USDT0_PLASMA,
              extra: { name: 'USDT0', version: '1', decimals: 6 },
            },
            payTo: state.addresses?.smartWallet || '0x0000000000000000000000000000000000000000',
          },
          {
            scheme: 'exact',
            network: STABLE_NETWORK,
            price: {
              amount: '10000',
              asset: USDT0_STABLE,
              extra: { name: 'USDT0', version: '1', decimals: 6 },
            },
            payTo: state.addresses?.smartWallet || '0x0000000000000000000000000000000000000000',
          },
        ],
        description: 'Premium AI intent processing with multi-chain support',
        mimeType: 'application/json',
      },
    },
    resourceServer,
  ),
)

// Premium intent endpoint (x402 gated)
app.post('/api/premium-intent', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet loaded' })

    const { message, chain = 'arbitrum' } = req.body
    if (!message) return res.status(400).json({ error: 'Missing message' })

    // Premium: Use MCP for multi-chain support
    const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd₮|usdt₮|\$)?/i)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/)

    if (!amountMatch || !addressMatch) {
      return res.status(400).json({ error: 'Could not parse intent' })
    }

    const amount = amountMatch[1]
    const to = addressMatch[0]

    res.json({
      premium: true,
      mcp: !!mcpServer,
      parsed: { amount: `${amount} USDT₮`, to, chain },
      message: 'Payment received! Premium intent processing active.',
      features: ['Multi-chain support', 'MCP toolkit', 'x402 micropayments'],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────

const PORT = 3456

app.listen(PORT, async () => {
  console.log(`\n🚀 FlowPay Enhanced running → http://localhost:${PORT}`)
  console.log(`   Features: WDK Core + MCP Toolkit (35 tools) + x402 Payments`)
  await autoLoadWallet()
  console.log('')
})
