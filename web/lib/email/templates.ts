import { BRAND, ROUTES } from '@/lib/site-config'

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, '') ||
    'https://www.eyesopen.to'
  )
}

export function welcomeWalletEmail(input: { email: string; walletAddress: string }) {
  const profileUrl = `${siteUrl()}${ROUTES.appProfile}#updates`
  const shortWallet = `${input.walletAddress.slice(0, 6)}…${input.walletAddress.slice(-4)}`

  const subject = `Your ${BRAND.name} wallet is ready`

  const text = [
    `${BRAND.name} — ${BRAND.slogan}`,
    '',
    `Your Eyes wallet (${shortWallet}) is linked to ${input.email}.`,
    '',
    'We will email you about:',
    '• New fair launches',
    '• Platform news',
    '• Season recaps',
    '',
    `Manage preferences anytime: ${profileUrl}`,
    '',
    `You are receiving this because you created an account at ${siteUrl()}.`,
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7344">${BRAND.name}</p>
      <h1 style="font-size:22px;margin:0 0 12px">${BRAND.slogan}</h1>
      <p>Your Eyes wallet <strong>${shortWallet}</strong> is linked to <strong>${input.email}</strong>.</p>
      <p>We will send launch alerts, platform news, and season recaps to this address. Change what you receive on Profile.</p>
      <p><a href="${profileUrl}" style="color:#8a7344">Manage email preferences →</a></p>
      <p style="font-size:12px;color:#666;margin-top:24px">You received this because you created an account at ${siteUrl()}.</p>
    </div>
  `.trim()

  return { subject, html, text }
}

export function passwordResetEmail(input: { email: string; token: string }) {
  const resetUrl = `${siteUrl()}/app/reset-password?token=${encodeURIComponent(input.token)}`
  const subject = `Reset your ${BRAND.name} password`

  const text = [
    `${BRAND.name} password reset`,
    '',
    'We received a request to reset your password.',
    '',
    `Reset link (expires in 1 hour): ${resetUrl}`,
    '',
    'If you did not request this, ignore this email.',
    '',
    'Note: resetting your password clears your embedded wallet encryption. Export your private key first if you have not.',
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7344">${BRAND.name}</p>
      <h1 style="font-size:22px;margin:0 0 12px">Reset your password</h1>
      <p>We received a request to reset the password for <strong>${input.email}</strong>.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#8a7344;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none">Reset password</a></p>
      <p style="font-size:13px;color:#666">Link expires in 1 hour. If you did not request this, ignore this email.</p>
      <p style="font-size:12px;color:#666;margin-top:20px">Resetting your password clears embedded wallet encryption. Export your private key from Profile first if you have not saved it elsewhere.</p>
    </div>
  `.trim()

  return { subject, html, text }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const { sendEyesEmail } = await import('@/lib/email/send')
  const tpl = passwordResetEmail({ email, token })
  return sendEyesEmail({ to: email, ...tpl })
}
