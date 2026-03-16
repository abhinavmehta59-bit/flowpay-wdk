/**
 * FlowPay — Railway Deploy Version
 * Simplified without MCP Toolkit (GitHub deps don't work on Railway)
 */

import 'dotenv/config'
import express from 'express'
import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'
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

const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const TEST_TOKEN_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const ACTIVE_NETWORK = process.env.NETWORK || 'arbitrum'
const ERC4337_CONFIG = {
  chainId: 42161,
  provider: ARBITRUM_RPC,
  safeModulesVersion: '0.3.0',
  entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  bundlerUrl: `https://api.pimlico.io/v2/arbitrum/rpc?apikey=${PIMLICO_KEY}`,
  paymasterUrl: `https://api.pimlico.io/v2/arbitrum/rpc?apikey=${PIMLICO_KEY}`,
  paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
  transferMaxFee: 100000000000000n,
  paymasterToken: { address: USDT_ARBITRUM }
}
const ACTIVE_USDT = USDT_ARBITRUM

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
])

const arbitrumClient = createPublicClient({ chain: arbitrum, transport: http(ARBITRUM_RPC) })

let state = { seed: null, addresses: null }

// Auto-load wallet
async function autoLoadWallet() {
  const seed = process.env.AGENT_SEED
  if (!seed) return console.log('No AGENT_SEED')
  try {
    const wdk = new WDK(seed)
      .registerWallet('ethereum', WalletManagerEvm, { provider: ETHEREUM_RPC })
      .registerWallet('arbitrum', WalletManagerEvm, { provider: ARBITRUM_RPC })
    const wdk4337 = new WDK(seed).registerWallet('arbitrum', WalletManagerEvmErc4337, ERC4337_CONFIG)
    
    const [ethAcc, arbAcc, smartAcc] = await Promise.all([
      wdk.getAccount('ethereum', 0),
      wdk.getAccount('arbitrum', 0),
      wdk4337.getAccount('arbitrum', 0),
    ])
    const [ethAddr, arbAddr, smartAddr] = await Promise.all([
      ethAcc.getAddress(), arbAcc.getAddress(), smartAcc.getAddress(),
    ])
    
    state = { seed, addresses: { ethereum: ethAddr, arbitrum: arbAddr, smartWallet: smartAddr }}
    console.log(`Wallet loaded: ${smartAddr}`)
  } catch (e) {
    console.error('Auto-load failed:', e.message)
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/api/status', (_, res) => {
  res.json({ ok: true, walletLoaded: !!state.seed, network: 'arbitrum', token: 'USDT', pimlico: !!PIMLICO_KEY })
})

app.post('/api/wallet/create', async (req, res) => {
  try {
    const seed = WDK.getRandomSeedPhrase()
    const wdk = new WDK(seed).registerWallet('arbitrum', WalletManagerEvmErc4337, ERC4337_CONFIG)
    const acc = await wdk.getAccount('arbitrum', 0)
    const addr = await acc.getAddress()
    state = { seed, addresses: { smartWallet: addr }}
    res.json({ seed, addresses: { smartWallet: addr }})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/wallet/load', async (req, res) => {
  try {
    const { seed } = req.body
    if (!seed?.trim() || seed.trim().split(' ').length !== 12) {
      return res.status(400).json({ error: 'Invalid seed' })
    }
    const wdk = new WDK(seed).registerWallet('arbitrum', WalletManagerEvmErc4337, ERC4337_CONFIG)
    const acc = await wdk.getAccount('arbitrum', 0)
    const addr = await acc.getAddress()
    state = { seed, addresses: { smartWallet: addr }}
    res.json({ seed, addresses: { smartWallet: addr }})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/balance/:address', async (req, res) => {
  try {
    const addr = req.params.address
    const [ethBal, usdtBal] = await Promise.all([
      arbitrumClient.getBalance({ address: addr }),
      arbitrumClient.readContract({ address: ACTIVE_USDT, abi: ERC20_ABI, functionName: 'balanceOf', args: [addr] }),
    ])
    res.json({ ETH: formatUnits(ethBal, 18), USDT: formatUnits(usdtBal, 6), network: 'arbitrum' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/send', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet' })
    const { to, amount } = req.body
    if (!to || !amount) return res.status(400).json({ error: 'Missing params' })
    
    const amountNum = parseFloat(amount)
    if (amountNum <= 0 || amountNum > 1000) return res.status(400).json({ error: 'Invalid amount' })
    
    const wdk4337 = new WDK(state.seed).registerWallet('arbitrum', WalletManagerEvmErc4337, ERC4337_CONFIG)
    const account = await wdk4337.getAccount('arbitrum', 0)
    const amountWei = parseUnits(amount.toString(), 6)
    
    const result = await account.sendTransaction({
      to: ACTIVE_USDT,
      data: '0xa9059cbb' + to.toLowerCase().replace('0x', '').padStart(64, '0') + amountWei.toString(16).padStart(64, '0'),
      value: '0',
    })
    
    res.json({ success: true, txHash: result.hash, explorerUrl: `https://arbiscan.io/tx/${result.hash}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/intent', async (req, res) => {
  try {
    if (!state.seed) return res.status(400).json({ error: 'No wallet' })
    const { message } = req.body
    const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd)?/i)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/)
    if (!amountMatch || !addressMatch) return res.status(400).json({ error: 'Parse failed' })
    
    const amount = amountMatch[1]
    const to = addressMatch[0]
    
    // Execute
    const wdk4337 = new WDK(state.seed).registerWallet('arbitrum', WalletManagerEvmErc4337, ERC4337_CONFIG)
    const account = await wdk4337.getAccount('arbitrum', 0)
    const amountWei = parseUnits(amount.toString(), 6)
    
    const result = await account.sendTransaction({
      to: ACTIVE_USDT,
      data: '0xa9059cbb' + to.toLowerCase().replace('0x', '').padStart(64, '0') + amountWei.toString(16).padStart(64, '0'),
      value: '0',
    })
    
    res.json({ parsed: { amount, to }, result: { txHash: result.hash, explorerUrl: `https://arbiscan.io/tx/${result.hash}` }})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Simplified MCP status (no actual MCP)
app.get('/api/mcp/tools', (_, res) => {
  res.json({ available: false, message: 'MCP Toolkit available on local deployment only', chains: 13, tools: 35 })
})

const PORT = process.env.PORT || 3456
app.listen(PORT, async () => {
  console.log(`FlowPay Railway running on port ${PORT}`)
  await autoLoadWallet()
})
