import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { SITE_URL } from '@/lib/chain-config'

export default function IntegrationsPage() {
  const webhookPayload = `{
  "event": "launch.discovery_registered",
  "sentAt": "2026-09-09T12:00:00.000Z",
  "data": { "launchId": "base-launch-1", "name": "My Token", "symbol": "TKN" }
}`

  return (
    <Container className="py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Integrations</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Zapier & Make</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Connect Eyes Open to automation tools using launch webhooks — no custom app required from our side.
      </p>

      <section className="mt-10 space-y-4 rounded-sm border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Zapier (Webhooks by Zapier)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Save a webhook URL in{' '}
            <Link href="/app/settings#webhooks" className="text-primary hover:underline">
              Settings → Launch webhooks
            </Link>
            .
          </li>
          <li>In Zapier, create a Zap → Trigger: <strong>Webhooks by Zapier → Catch Hook</strong>.</li>
          <li>Copy the Zapier URL into Eyes Open, then click <strong>Send test event</strong>.</li>
          <li>Map fields from the JSON payload to Slack, Google Sheets, Discord, etc.</li>
        </ol>
      </section>

      <section className="mt-6 space-y-4 rounded-sm border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Make (Integromat)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Create a scenario → <strong>Webhooks → Custom webhook</strong>.</li>
          <li>Paste the Make URL into Eyes Open Settings.</li>
          <li>Use the test event to define your data structure, then add modules downstream.</li>
        </ol>
      </section>

      <section className="mt-6 rounded-sm border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Webhook payload</h2>
        <pre className="mt-3 overflow-x-auto rounded-sm bg-muted/40 p-4 text-xs text-foreground">{webhookPayload}</pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Signed with <code className="text-foreground">X-Eyes-Signature</code> when a secret is set. REST API docs:{' '}
          <a href={`${SITE_URL}/api/v1/docs`} className="text-primary hover:underline">
            {SITE_URL}/api/v1/docs
          </a>
        </p>
      </section>
    </Container>
  )
}
