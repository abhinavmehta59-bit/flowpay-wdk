/**
 * OpenClaw FlowPay Handler
 * 
 * This module integrates FlowPay with Jarvis (OpenClaw agent).
 * When Boss sends a payment command via Telegram, Jarvis detects it,
 * calls the FlowPay server, and confirms the transaction.
 */

const FLOWPAY_SERVER = 'http://localhost:3456'

/**
 * Check if a message is a FlowPay payment command
 * Patterns: "flowpay send...", "send 5 usdt...", "pay 0x..."
 */
function isPaymentCommand(message) {
  const lower = message.toLowerCase().trim()
  return lower.startsWith('flowpay') || 
         /^(send|pay)\s+\d/.test(lower)
}

/**
 * Parse payment intent from natural language
 */
function parseIntent(message) {
  // Extract amount
  const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd₮|usdt₮|\$)?/i)
  // Extract address
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/)
  // Extract memo (after "for")
  const memoMatch = message.match(/for\s+(.+)$/i)
  
  return {
    amount: amountMatch ? amountMatch[1] : null,
    to: addressMatch ? addressMatch[0] : null,
    memo: memoMatch ? memoMatch[1] : null,
    raw: message
  }
}

/**
 * Execute payment via FlowPay server
 */
async function executePayment(intent) {
  try {
    const response = await fetch(`${FLOWPAY_SERVER}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: intent.raw })
    })
    
    const result = await response.json()
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return {
      success: true,
      amount: result.parsed.amount,
      to: result.parsed.to,
      txHash: result.result.txHash,
      explorerUrl: result.result.explorerUrl,
      rules: result.rules
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Format response for Telegram
 */
function formatResponse(result, intent) {
  if (!result.success) {
    return `❌ Payment failed: ${result.error}`
  }
  
  return `✅ **Payment Executed**

**Amount:** ${result.amount}
**To:** \`${result.to.slice(0, 6)}...${result.to.slice(-4)}\`
**Tx:** [${result.txHash.slice(0, 12)}...](${result.explorerUrl})

_Rules checked: ${Object.keys(result.rules).filter(k => result.rules[k]).join(', ')}_`
}

/**
 * Main handler — called by OpenClaw when message received
 */
export async function handlePaymentCommand(message) {
  if (!isPaymentCommand(message)) {
    return null // Not a payment command, let other handlers process
  }
  
  const intent = parseIntent(message)
  
  if (!intent.amount || !intent.to) {
    return `❓ Could not parse payment. Try:\n\`flowpay send 5 USDT to 0x... for invoice #42\``
  }
  
  const result = await executePayment(intent)
  return formatResponse(result, intent)
}

// Example usage:
// handlePaymentCommand("flowpay send 1 USDT to 0xDFed...51f78 for test")
//   .then(console.log)
