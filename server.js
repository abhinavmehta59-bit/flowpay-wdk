/**
 * FlowPay — Hackathon Demo Server
 * Tether Galactica WDK Edition 1
 *
 * API:
 *   POST /api/wallet/create     — generate new agent wallet
 *   POST /api/wallet/load       — load from seed phrase
 *   GET  /api/balance/:address  — USDC + ETH balance (Sepolia)
 *   POST /api/send              — gasless USDC transfer (ERC-4337, Sepolia)
 *   POST /api/aave/deposit      — supply USDC to Aave (Arbitrum)
 *   GET  /api/aave/position/:address — yield position on Aave
 *   GET  /api/status            — health check
 */

import 'dotenv/config'
import express from 'express'
import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
import AaveProtocolEvm from '@tetherto/wdk-protocol-lending-aave-evm'
import { createPublicClient, http, parseAbi, formatUnits, parseUnits } from 'viem'
import { sepolia, arbitrum } from 'viem/chains'

const app = express()
app.use(express.json())
app.use(express.static('public'))

// ─── Network Config ───────────────────────────────────────────────────────

const SEPOLIA_RPC  = 'https://sepolia.drpc.org'
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc'
const ETHEREUM_RPC = 'https://eth.drpc.org'
const PIMLICO_KEY  = process.env.PIMLICO_API_KEY

// ── USDT₮ token addresses ──────────────────────────────────────────────────
const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' // real USDT on Arbitrum
const USDT_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7' // real USDT on Ethereum
const TEST_TOKEN_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // mock test token (Sepolia only)

// ── ERC-4337 config: Arbitrum mainnet (USDT₮, hackathon demo) ─────────────
const ERC4337_CONFIG_ARBITRUM = {
  chainId:            42161,
  provider:           ARBITRUM_RPC,
  safeModulesVersion: '0.3.0',
  entryPointAddress:  '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  bundlerUrl:         `https://api.pimlico.io/v2/arbitrum/rpc?apikey=${PIMLICO_KEY}`,
  paymasterUrl:       `https://api.pimlico.io/v2/arbitrum/rpc?apikey=${PIMLICO_KEY}`,
  paymasterAddress:   '0x777777777777AeC03fd955926DbF81597e66834C',
  transferMaxFee:     100000000000000n,
  paymasterToken: {
    address: USDT_ARBITRUM  // real USDT₮ pays for gas
  }
}

// ── ERC-4337 config: Sepolia testnet (mock token, dev only) ──────────────
const ERC4337_CONFIG_SEPOLIA = {
  chainId:            11155111,
  provider:           SEPOLIA_RPC,
  safeModulesVersion: '0.3.0',
  entryPointAddress:  '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  bundlerUrl:         `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_KEY}`,
  paymasterUrl:       `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_KEY}`,
  paymasterAddress:   '0x777777777777AeC03fd955926DbF81597e66834C',
  transferMaxFee:     100000000000000n,
  paymasterToken: {
    address: TEST_TOKEN_SEPOLIA
  }
}

// Active config — switch between 'arbitrum' (demo) and 'sepolia' (dev)
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

let state = {
  seed: null,
  addresses: null
}

// Auto-load wallet from .env on startup
async function autoLoadWallet() {
  const seed = process.env.AGENT_SEED
  if (!seed) return console.log('   No AGENT_SEED in .env — create wallet via UI')
  try {
    const result = await buildWallet(seed)
    state = result
    console.log(`   Agent wallet loaded: ${result.addresses.smartWallet}`)
    console.log(`   Network: ${ACTIVE_NETWORK} | Token: USDT₮`)
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
    pimlico: !!PIMLICO_KEY
  })
})

// Create new wallet
app.post('/api/wallet/create', async (req, res) => {
  try {
    const seed = WDK.getRandomSeedPhrase()
    const result = await buildWallet(seed)
    state = result
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

// Send USDC gaslessly (ERC-4337, Sepolia)
app.post('/api/send', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet loaded' })

    const { to, amount } = req.body
    if (!to || !amount) return res.status(400).json({ error: 'Missing to/amount' })

    // Rule engine check (simple for now)
    const amountNum = parseFloat(amount)
    if (amountNum <= 0)    return res.status(400).json({ error: 'Amount must be > 0' })
    if (amountNum > 1000)  return res.status(400).json({ error: 'Rule engine: max 1000 USDC per tx' })

    const wdk4337 = new WDK(state.seed)
      .registerWallet(ACTIVE_NETWORK, WalletManagerEvmErc4337, ERC4337_CONFIG)
    const account = await wdk4337.getAccount(ACTIVE_NETWORK, 0)

    // Build ERC-20 transfer calldata (USDT₮ = 6 decimals)
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

// Aave position on Arbitrum (read-only — no real funds needed to view)
app.get('/api/aave/position/:address', async (req, res) => {
  try {
    const addr = req.params.address

    // Check USDC balance on Arbitrum
    const usdcBal = await arbitrumClient.readContract({
      address: USDC_ARBITRUM,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    })

    res.json({
      address: addr,
      usdcBalance: formatUnits(usdcBal, 6),
      network: 'Arbitrum',
      aaveNote: 'Supply USDC to Aave on Arbitrum to earn ~4-8% APY on idle funds',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Parse natural language payment intent + execute
// e.g. "Send 5 USDT to 0xABC...123 for invoice #42"
app.post('/api/intent', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet loaded' })

    const { message } = req.body
    if (!message) return res.status(400).json({ error: 'Missing message' })

    // Parse amount
    const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd₮|usdt₮|\$)?/i)
    // Parse Ethereum address
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/)
    // Parse memo (everything after "for")
    const memoMatch = message.match(/for (.+)$/i)

    if (!amountMatch) return res.status(400).json({ error: 'Could not parse amount. Try: "Send 5 USDT to 0x..."' })
    if (!addressMatch) return res.status(400).json({ error: 'Could not find a valid 0x address' })

    const amount = amountMatch[1]
    const to     = addressMatch[0]
    const memo   = memoMatch ? memoMatch[1] : 'no memo'

    // Rule engine
    const amountNum = parseFloat(amount)
    if (amountNum <= 0)   return res.status(400).json({ error: 'Amount must be greater than 0' })
    if (amountNum > 1000) return res.status(400).json({ error: `Rule engine blocked: max 1000 USDT per tx (requested ${amount})` })

    // Check balance
    const balRes  = await fetch(`http://localhost:${PORT}/api/balance/${state.addresses.smartWallet}`)
    const balData = await balRes.json()
    if (parseFloat(balData.USDT) < amountNum) {
      return res.status(400).json({ error: `Insufficient balance: have ${balData.USDT} USDT, need ${amount}` })
    }

    // Execute
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

// Simple ABI encode for ERC-20 transfer (no external dep)
function encodeFunctionData_transfer(to, amount) {
  // transfer(address,uint256) selector = 0xa9059cbb
  const selector = '0xa9059cbb'
  const paddedTo  = to.toLowerCase().replace('0x', '').padStart(64, '0')
  const paddedAmt = amount.toString(16).padStart(64, '0')
  return selector + paddedTo + paddedAmt
}

// ─── Start ────────────────────────────────────────────────────────────────

const PORT = 3456
app.listen(PORT, async () => {
  console.log(`\n🚀 FlowPay running → http://localhost:${PORT}`)
  await autoLoadWallet()
  console.log('')
})
