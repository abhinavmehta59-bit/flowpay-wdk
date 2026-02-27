# FlowPay — AI Agent Payments on Tether WDK + OpenClaw

> **Tether Hackathon Galáctica: WDK Edition 1**
> Track: 🤖 Agent Wallets (WDK / OpenClaw Integration)

FlowPay is an autonomous AI payment agent that holds a self-custodial wallet, receives payment instructions via natural language (Telegram/OpenClaw), enforces a rule engine, and executes cross-border USDT₮ transfers gaslessly on Arbitrum — with no ETH required.

## Live Demo

- **Network:** Arbitrum Mainnet
- **Token:** USDT₮ (real Tether)
- **First tx:** [0x140acaf...](https://arbiscan.io/tx/0x140acaf09a1b77b47feb16b60a86dcb575a5eeb37f11d478d175b4d064f1138c)

## How It Works

```
User → Telegram → OpenClaw (Jarvis AI) → Rule Engine → WDK ERC-4337 Wallet → Arbitrum
```

1. User sends instruction: *"Send 10 USDT to 0x... for invoice #42"*
2. OpenClaw AI parses intent, validates against rule engine
3. Rule engine checks: amount limit ✅, recipient valid ✅, balance sufficient ✅
4. WDK ERC-4337 smart wallet signs + submits UserOperation via Pimlico
5. USDT₮ pays its own gas — no ETH needed
6. Agent confirms on Telegram: *"✅ Sent 10 USDT. Tx: 0x..."*

## Stack

| Layer | Tech |
|-------|------|
| Wallet | Tether WDK (`@tetherto/wdk`, `@tetherto/wdk-wallet-evm-erc-4337`) |
| Gasless | ERC-4337 Account Abstraction via Pimlico |
| Yield | Aave V3 (`@tetherto/wdk-protocol-lending-aave-evm`) |
| Bridge | USDT0 (`@tetherto/wdk-protocol-bridge-usdt0-evm`) |
| Agent | OpenClaw (Jarvis AI) via Telegram |
| API | Express.js |
| Chain reads | Viem |
| Network | Arbitrum One |

## Key Features

- ✅ **Self-custodial wallets** — BIP-39/44, agent owns its own keys
- ✅ **Gasless USDT₮ transfers** — ERC-4337, gas paid in USDT not ETH
- ✅ **Rule engine** — amount limits, recipient whitelist, daily caps
- ✅ **Yield on idle funds** — Aave V3 integration (4-8% APY)
- ✅ **Natural language interface** — OpenClaw/Telegram integration
- ✅ **No LLM in payment path** — AI parses intent only, rule engine executes

## Quick Start

```bash
git clone https://github.com/abhinavmehta59-bit/flowpay-wdk
cd flowpay-wdk
npm install

# Create .env
echo "PIMLICO_API_KEY=your_key_here" > .env

# Start server
node server.js

# Open UI
open http://localhost:3456
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet/create` | POST | Generate new agent wallet |
| `/api/wallet/load` | POST | Load wallet from seed phrase |
| `/api/balance/:address` | GET | USDT₮ + ETH balance |
| `/api/send` | POST | Gasless USDT₮ transfer |
| `/api/aave/position/:address` | GET | Aave yield position |
| `/api/status` | GET | Server health check |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FlowPay                          │
│                                                     │
│  OpenClaw (Jarvis)  ←→  Telegram                    │
│         ↓                                           │
│    Rule Engine                                      │
│    (amount / recipient / balance checks)            │
│         ↓                                           │
│    WDK ERC-4337 Wallet                              │
│    (Safe smart contract, EVM)                       │
│         ↓                                           │
│    Pimlico Bundler → Arbitrum Mainnet               │
│                                                     │
│  Idle funds → Aave V3 → Yield                       │
└─────────────────────────────────────────────────────┘
```

## Why This Wins

- **OpenClaw-native** — Jarvis IS the agent. The Telegram integration is live.
- **Real USDT₮ on mainnet** — not a testnet demo
- **ERC-4337 gasless** — production-grade account abstraction
- **Economic model** — fee on transfers + yield share from Aave
- **Real-world use case** — remittance, salary payments, invoice settlement

## Hackathon

[Tether Hackathon Galáctica: WDK Edition 1](https://dorahacks.io/hackathon/hackathon-galactica-wdk-2026-01/detail)
Submission deadline: March 22, 2026
