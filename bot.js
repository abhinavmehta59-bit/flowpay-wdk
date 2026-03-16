/**
 * FlowPay Telegram Bot
 * Dedicated bot for autonomous USDT payments
 * 
 * Usage: Send "Send 5 USDT to 0x... for invoice #42"
 * Bot parses → validates → executes → confirms
 */

import TelegramBot from 'node-telegram-bot-api'

const BOT_TOKEN = process.env.FLOWPAY_BOT_TOKEN || '8530507496:AAF5TGnf_rJSr17TXRuzRzHDhMjQB7-n8gA'
const FLOWPAY_API = 'http://localhost:3456'

const bot = new TelegramBot(BOT_TOKEN, { polling: true })

console.log('🤖 FlowPay Bot started')

// Welcome message
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, 
    `💸 *FlowPay — AI Payment Agent*\n\n` +
    `Send USDT₮ on Arbitrum via natural language.\n\n` +
    `*Example:*\n` +
    `\`Send 5 USDT to 0xABC... for invoice #42\`\n\n` +
    `Rules: max 1000 USDT, balance checked, no ETH needed.`,
    { parse_mode: 'Markdown' }
  )
})

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId,
    `*Commands:*\n` +
    `/start — Welcome\n` +
    `/balance — Check wallet balance\n` +
    `/status — System status\n\n` +
    `*Send payment:*\n` +
    `Just type: "Send X USDT to 0x... [for reason]"`,
    { parse_mode: 'Markdown' }
  )
})

// Check balance
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id
  try {
    const res = await fetch(`${FLOWPAY_API}/api/status`)
    const status = await res.json()
    
    if (!status.walletLoaded) {
      return bot.sendMessage(chatId, '⚠️ Wallet not loaded. Contact admin.')
    }
    
    const balRes = await fetch(`${FLOWPAY_API}/api/balance/${status.walletAddress || '0x63210adB0207Db49404A219583471576566faD59'}`)
    const bal = await balRes.json()
    
    bot.sendMessage(chatId,
      `💳 *Wallet Balance*\n\n` +
      `USDT₮: ${bal.USDT || '0'}\n` +
      `ETH (gas): ${bal.ETH || '0'}`,
      { parse_mode: 'Markdown' }
    )
  } catch (e) {
    bot.sendMessage(chatId, '❌ Error checking balance')
  }
})

// Status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id
  try {
    const res = await fetch(`${FLOWPAY_API}/api/status`)
    const status = await res.json()
    bot.sendMessage(chatId,
      `📊 *FlowPay Status*\n\n` +
      `Network: ${status.network || 'arbitrum'}\n` +
      `Wallet: ${status.walletLoaded ? '✅ Loaded' : '❌ Not loaded'}\n` +
      `Token: ${status.token || 'USDT₮'}`,
      { parse_mode: 'Markdown' }
    )
  } catch (e) {
    bot.sendMessage(chatId, '❌ Server offline')
  }
})

// Payment intent handler
bot.on('message', async (msg) => {
  // Skip commands
  if (msg.text?.startsWith('/')) return
  
  const chatId = msg.chat.id
  const text = msg.text
  
  // Check if it's a payment command
  const lower = text.toLowerCase()
  const isPayment = /^(send|pay|transfer)\s+\d/.test(lower) || lower.includes('usdt') || lower.includes('to 0x')
  
  if (!isPayment) return
  
  // Parse
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd₮|usdt₮|\$)?/i)
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/)
  
  if (!amountMatch || !addressMatch) {
    return bot.sendMessage(chatId, 
      '❓ Could not parse. Try:\n' +
      '`Send 5 USDT to 0xABC... for invoice`',
      { parse_mode: 'Markdown' }
    )
  }
  
  const amount = amountMatch[1]
  const to = addressMatch[0]
  
  // Confirm
  bot.sendMessage(chatId, 
    `⏳ Executing: *${amount} USDT₮* → \`${to.slice(0, 6)}...${to.slice(-4)}\``,
    { parse_mode: 'Markdown' }
  )
  
  // Execute
  try {
    const res = await fetch(`${FLOWPAY_API}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
    
    const result = await res.json()
    
    if (result.error) {
      return bot.sendMessage(chatId, `❌ Failed: ${result.error}`)
    }
    
    const tx = result.result
    bot.sendMessage(chatId,
      `✅ *Payment Sent*\n\n` +
      `Amount: ${tx.amount}\n` +
      `To: \`${to.slice(0, 6)}...${to.slice(-4)}\`\n` +
      `Tx: [${tx.txHash.slice(0, 12)}...](${tx.explorerUrl})\n\n` +
      `_Rules: amount ✓ address ✓ balance ✓_`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    )
  } catch (e) {
    bot.sendMessage(chatId, `❌ Error: ${e.message}`)
  }
})

console.log('✅ Bot ready. Waiting for messages...')
