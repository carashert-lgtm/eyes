const RESEND_API = 'https://api.resend.com/emails'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type SendEmailResult =
  | { ok: true; id?: string; skipped?: false }
  | { ok: true; skipped: true }
  | { ok: false; error: string }

function emailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Eyes Open <updates@eyesopen.to>'
  )
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

/** Send a transactional email via Resend. Skips quietly when RESEND_API_KEY is unset. */
export async function sendEyesEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { ok: true, skipped: true }
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })

    const data = (await res.json()) as { id?: string; message?: string }
    if (!res.ok) {
      return { ok: false, error: data.message ?? `Email API HTTP ${res.status}` }
    }
    return { ok: true, id: data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Email send failed' }
  }
}
