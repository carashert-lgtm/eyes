import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/chain-config'
import { loadLaunchesSnapshot } from '@/lib/launch-data'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EmbedLaunchPage({ params }: Props) {
  const { id } = await params
  const snapshot = await loadLaunchesSnapshot()
  const launch = snapshot.launches.find((l) => l.id === id)

  if (!launch) notFound()

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        padding: 16,
        background: '#12100e',
        color: '#f5f0e6',
        border: '1px solid #3d3424',
        borderRadius: 8,
        maxWidth: 360,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#b8a88a',
            }}
          >
            {launch.chainKey} · Eyes Open
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>{launch.name}</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#b8a88a' }}>${launch.symbol}</p>
        </div>
        {launch.boost ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#d4af37',
              border: '1px solid #a97f12',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            BOOSTED
          </span>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontSize: 12,
        }}
      >
        <div>
          <span style={{ color: '#b8a88a' }}>Phase</span>
          <div style={{ fontWeight: 600 }}>{launch.phase}</div>
        </div>
        <div>
          <span style={{ color: '#b8a88a' }}>Launch #</span>
          <div style={{ fontWeight: 600 }}>{launch.launchId ?? '—'}</div>
        </div>
      </div>

      <a
        href={`${SITE_URL}/app/launches/${launch.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          marginTop: 14,
          textAlign: 'center',
          background: '#d4af37',
          color: '#0a0908',
          padding: '10px 12px',
          borderRadius: 4,
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        View launch →
      </a>
      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#b8a88a', textAlign: 'center' }}>
        Powered by Eyes Open
      </p>
    </div>
  )
}
