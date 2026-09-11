import { createHmac } from 'crypto'
import { getAccountSettings } from '@/lib/settings/account-settings-store'
import type { WebhookEventFilter } from '@/lib/settings/types'
import { isLaunchChainKey } from '@/lib/launch-chains/registry'

export async function dispatchLaunchWebhook(
  email: string,
  event: WebhookEventFilter,
  payload: Record<string, unknown> & { chainKey?: string; creator?: string },
  creatorEmail?: string,
): Promise<void> {
  let settings
  try {
    settings = await getAccountSettings(email)
  } catch {
    return
  }

  if (!settings.webhookEvents.includes(event)) return

  const chainKey = typeof payload.chainKey === 'string' ? payload.chainKey : null
  if (
    settings.webhookFilterChains.length > 0 &&
    chainKey &&
    isLaunchChainKey(chainKey) &&
    !settings.webhookFilterChains.includes(chainKey)
  ) {
    return
  }

  if (settings.webhookOnlyMine && creatorEmail && creatorEmail.toLowerCase() !== email.toLowerCase()) {
    return
  }

  const url = settings.launchWebhookUrl?.trim()
  if (!url || !url.startsWith('https://')) return

  const body = JSON.stringify({
    event,
    sentAt: new Date().toISOString(),
    data: payload,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'EyesOpen-LaunchWebhook/1.0',
  }

  if (settings.launchWebhookSecret) {
    const sig = createHmac('sha256', settings.launchWebhookSecret).update(body).digest('hex')
    headers['X-Eyes-Signature'] = `sha256=${sig}`
  }

  try {
    await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
  } catch {
    // Best-effort — do not block launch flow
  }
}
