/**
 * FlowPay Agent Wallet — Full Testnet Demo
 * 
 * This is what a FlowPay "remittance agent" wallet looks like in code.
 * Uses ERC-4337 (Account Abstraction) so the agent pays gas in USDT — no ETH needed.
 * 
 * Network: Sepolia testnet (safe to test, no real money)
 * Bundler: Candide public endpoint (no API key required)
 */

import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337'

// ─── Sepolia Testnet Config ────────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = 11155111
const SEPOLIA_RPC      = 'https://sepolia.drpc.org'

// Candide public bundler — no API key needed for testing
const CANDIDE_BUNDLER_SEPOLIA   = 'https://api.candide.dev/public/v3/sepolia'
const CANDIDE_PAYMASTER_SEPOLIA = 'https://api.candide.dev/public/v3/sepolia'
const CANDIDE_PAYMASTER_ADDR    = '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba'

// Standard ERC-4337 EntryPoint v0.7
const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'

// Test USDT on Sepolia (Pimlico mock token — get from faucet below)
const USDT_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Circle USDC on Sepolia

// ─── ERC-4337 Config ───────────────────────────────────────────────────────

const erc4337Config = {
  chainId:            SEPOLIA_CHAIN_ID,
  provider:           SEPOLIA_RPC,
  safeModulesVersion: '0.3.0',
  entryPointAddress:  ENTRY_POINT,
  bundlerUrl:         CANDIDE_BUNDLER_SEPOLIA,
  paymasterUrl:       CANDIDE_PAYMASTER_SEPOLIA,
  paymasterAddress:   CANDIDE_PAYMASTER_ADDR,
  transferMaxFee:     100000000000000, // 0.0001 ETH max gas
  paymasterToken: {
    address: USDT_SEPOLIA
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║   FlowPay — Agent Wallet (Sepolia Testnet)  ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // ── Step 1: Create or load agent seed ───────────────────────────────────
  // In production: encrypted + stored in secure vault
  // For testing: generate fresh each run
  const agentSeed = WDK.getRandomSeedPhrase()
  console.log('🤖 Agent seed phrase (SAVE THIS — acts as your private key):')
  console.log(`   ${agentSeed}\n`)

  // ── Step 2: Standard EVM wallet (for checking addresses on mainnet) ──────
  console.log('🔗 Standard EVM addresses (mainnet-ready):')
  const wdk = new WDK(agentSeed)
    .registerWallet('ethereum', WalletManagerEvm, { provider: 'https://eth.drpc.org' })
    .registerWallet('arbitrum', WalletManagerEvm, { provider: 'https://arbitrum.drpc.org' })

  const ethAccount = await wdk.getAccount('ethereum', 0)
  const arbAccount = await wdk.getAccount('arbitrum', 0)
  console.log(`   Ethereum : ${await ethAccount.getAddress()}`)
  console.log(`   Arbitrum : ${await arbAccount.getAddress()} ← X402-ready\n`)

  // ── Step 3: ERC-4337 Smart Wallet on Sepolia ─────────────────────────────
  console.log('⚡ Setting up ERC-4337 smart wallet on Sepolia...')

  try {
    const wdk4337 = new WDK(agentSeed)
      .registerWallet('sepolia', WalletManagerEvmErc4337, erc4337Config)

    const agentAccount = await wdk4337.getAccount('sepolia', 0)
    const agentAddress = await agentAccount.getAddress()

    console.log(`   Smart wallet address : ${agentAddress}`)
    console.log('   ✅ This is a Safe smart contract wallet (ERC-4337)\n')

    console.log('═══════════════════════════════════════════════')
    console.log('  💸 To test a real USDT transfer:')
    console.log('═══════════════════════════════════════════════')
    console.log('')
    console.log('  1. Get test USDT → https://dashboard.pimlico.io/test-erc20-faucet')
    console.log(`     Paste this address: ${agentAddress}`)
    console.log('     Network: Sepolia')
    console.log('')
    console.log('  2. Re-run this script with your seed phrase to check balance')
    console.log('  3. Then we\'ll add the sendTransaction() call')
    console.log('')
    console.log('  Note: No ETH needed — gas paid in USDT via Candide paymaster')
    console.log('═══════════════════════════════════════════════\n')

  } catch (err) {
    console.log(`\n  ⚠️  ERC-4337 setup error: ${err.message}`)
    console.log('  This usually means the bundler is unreachable or config needs tweaking.')
    console.log('  The standard EVM wallets above still work fine.\n')
  }
}

main().catch(console.error)
