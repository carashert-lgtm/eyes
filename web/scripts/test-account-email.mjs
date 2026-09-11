/**
 * Account email logic — run before deploy:
 *   npx tsx scripts/test-account-email.mjs
 */
import { readFileSync } from 'fs'
import { welcomeWalletEmail } from '../lib/email/templates.ts'
import { isEmailDeliveryConfigured } from '../lib/email/send.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const panel = readFileSync(new URL('../components/app/AccountUpdatesPanel.tsx', import.meta.url), 'utf8')
if (/Google|next-auth|signIn|MetaMask/i.test(panel)) {
  fail('AccountUpdatesPanel still references Google OAuth or external login')
}

const auth = readFileSync(new URL('../lib/auth.ts', import.meta.url), 'utf8')
if (/Google\(/i.test(auth)) {
  fail('lib/auth.ts still registers Google provider')
}

const welcome = welcomeWalletEmail({
  email: 'user@example.com',
  walletAddress: '0x1234567890123456789012345678901234567890',
})
if (!welcome.subject.includes('Eyes Open')) fail('welcome email missing brand')
if (!welcome.text.includes('user@example.com')) fail('welcome email missing recipient')
if (/Builder Alpha|demo|mock/i.test(welcome.html)) fail('welcome email contains mock data')

console.log('PASS account email logic', {
  resendConfigured: isEmailDeliveryConfigured(),
  welcomeSubject: welcome.subject,
})

process.exit(failed)
