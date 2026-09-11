import Link from 'next/link'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import {
  getAuditStatus,
  getContractStatusRows,
  getOwnershipStatus,
  getTrustChecklist,
} from '@/lib/contract-status'
import { ROUTES } from '@/lib/site-config'

function StatusPill({ status }: { status: string }) {
  const styles =
    status === 'live' || status === 'Published' || status === 'Safe controls platform'
      ? 'border-primary/40 bg-primary/10 text-primary'
      : status === 'In progress'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : 'border-border bg-surface text-muted-foreground'

  return (
    <span className={`rounded-full border px-2.5 py-0.5 font-mono-label text-[0.58rem] ${styles}`}>
      {status}
    </span>
  )
}

export function TrustVerificationPanel() {
  const rows = getContractStatusRows()
  const audit = getAuditStatus()
  const ownership = getOwnershipStatus()
  const checklist = getTrustChecklist()

  return (
    <section id="trust" className="scroll-mt-24">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Trust &amp; verification
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Verify addresses on BaseScan before you send ETH. We publish everything here—no audit
            badge yet, but full transparency on what is live and how the platform works.
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface/80 font-mono-label text-[0.58rem] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Contract</th>
              <th className="hidden px-4 py-3 md:table-cell">Address</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">BaseScan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="bg-card/40">
                <td className="px-4 py-4">
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                  {row.address ? (
                    <p className="mt-2 font-mono-label text-[0.62rem] text-muted-foreground md:hidden">
                      {row.address}
                    </p>
                  ) : null}
                </td>
                <td className="hidden px-4 py-4 font-mono-label text-[0.65rem] text-muted-foreground md:table-cell">
                  {row.address ?? '—'}
                </td>
                <td className="px-4 py-4">
                  <StatusPill status={row.status === 'live' ? 'Live' : 'Pending'} />
                </td>
                <td className="px-4 py-4">
                  {row.basescanUrl ? (
                    <Link
                      href={row.basescanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card/60 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-foreground">Security audit</h3>
            <StatusPill status={audit.label} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{audit.detail}</p>
          {audit.reportUrl ? (
            <Link
              href={audit.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Read audit report
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        <div className="rounded-md border border-border bg-card/60 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-foreground">Platform admin</h3>
            <StatusPill
              status={
                ownership.platformAdminOnSafe ? 'Safe controls platform' : 'Deployer EOA'
              }
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ownership.note}</p>
          {ownership.deployer ? (
            <p className="mt-2 break-all font-mono-label text-[0.62rem] text-muted-foreground sm:break-normal">
              Deployer: {ownership.deployer}
            </p>
          ) : null}
          {ownership.multisigTarget ? (
            <p className="mt-1 break-all font-mono-label text-[0.62rem] text-muted-foreground sm:break-normal">
              Safe: {ownership.multisigTarget}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 rounded-md border border-primary/20 bg-primary/5 p-6">
        <h3 className="font-display text-lg font-bold text-foreground">
          Verify in 5 minutes
        </h3>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {checklist.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link
          href={ROUTES.legalTrust}
          className="mt-5 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Full trust &amp; verification guide →
        </Link>
      </div>
    </section>
  )
}
