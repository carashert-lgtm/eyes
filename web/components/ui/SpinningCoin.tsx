import { cn } from '@/lib/utils'

/**
 * Premium gold $EYES medallion — hero focal point.
 * 3D CSS: stacked rim slices + two faces, slow Y-axis spin with float.
 */
export function SpinningCoin({
  className,
  size = 240,
}: {
  className?: string
  size?: number
}) {
  const rimSlices = Array.from({ length: 22 })
  const rimStep = 1.2
  const rimHalf = (rimSlices.length / 2) * rimStep
  const faceHalf = rimHalf + 3
  const stage = size * 1.9

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: stage, height: stage, maxWidth: '100%' }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: size * 1.35,
          height: size * 1.35,
          background:
            'radial-gradient(circle, rgba(212,175,55,0.5) 0%, rgba(234,179,8,0.16) 45%, transparent 72%)',
          animation: 'glow-pulse 6s ease-in-out infinite',
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-0 top-[38%] h-px w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)',
            animation: 'streak-drift 9s ease-in-out infinite',
          }}
        />
        <div
          className="absolute left-0 top-[62%] h-px w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(234,179,8,0.4), transparent)',
            animation: 'streak-drift 11s ease-in-out infinite 2.5s',
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute rounded-full border border-primary/25"
        style={{
          width: size * 1.5,
          height: size * 1.5,
          transform: 'rotateX(74deg)',
          animation: 'orbit-cw 26s linear infinite',
          boxShadow: '0 0 24px -6px rgba(212,175,55,0.4)',
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full border border-accent-glow/20"
        style={{
          width: size * 1.72,
          height: size * 1.72,
          transform: 'rotateX(74deg) rotateZ(60deg)',
          animation: 'orbit-ccw 34s linear infinite',
        }}
      />

      <div
        className="pointer-events-none absolute rounded-full blur-2xl"
        style={{
          bottom: stage * 0.18,
          width: size * 0.7,
          height: size * 0.12,
          background: 'rgba(120,90,10,0.28)',
        }}
      />

      <div style={{ perspective: '1200px', animation: 'coin-float 6s ease-in-out infinite' }}>
        <div
          className="relative"
          style={{
            width: size,
            height: size,
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            animation: 'coin-spin 10s linear infinite',
          }}
        >
          {rimSlices.map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                transform: `translateZ(${(i - rimSlices.length / 2) * rimStep}px)`,
                background:
                  i % 2 === 0
                    ? 'radial-gradient(circle at 50% 40%, #b8860b, #7a5a09)'
                    : 'radial-gradient(circle at 50% 40%, #e6bd3f, #a97f12)',
                boxShadow: 'inset 0 0 14px rgba(80,55,5,0.55)',
              }}
            />
          ))}

          <CoinFace half={faceHalf} size={size} side="front" />
          <CoinFace half={faceHalf} size={size} side="back" />
        </div>
      </div>
    </div>
  )
}

function CoinFace({
  half,
  size,
  side,
}: {
  half: number
  size: number
  side: 'front' | 'back'
}) {
  const isBack = side === 'back'

  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        transform: isBack
          ? `rotateY(180deg) translateZ(${half}px)`
          : `translateZ(${half}px)`,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        background:
          'radial-gradient(circle at 32% 26%, #fdf3cf 0%, #f2d97a 20%, #e6bd3f 44%, #c9a227 68%, #a97f12 100%)',
        boxShadow:
          'inset 0 0 0 6px rgba(180,131,9,0.55), inset 0 0 34px rgba(120,85,6,0.4), 0 14px 40px rgba(120,90,10,0.35)',
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 66%, rgba(255,255,255,0.2) 100%)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <div
        className="absolute inset-[7px] rounded-full"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,240,190,0.85)', pointerEvents: 'none' }}
      />
      <div className="absolute inset-[16px] rounded-full border border-[#8b6914]/45" />

      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-1">
          <span
            className="font-mono-label"
            style={{ fontSize: size * 0.05, letterSpacing: '0.28em', color: '#8b6914' }}
          >
            EYES OPEN
          </span>
          <span
            className="font-display font-extrabold tracking-tight"
            style={{
              fontSize: size * 0.22,
              lineHeight: 1,
              color: '#5c440c',
              textShadow: '0 1px 0 rgba(255,245,205,0.6)',
            }}
          >
            $EYES
          </span>
          <div
            className="mt-0.5"
            style={{ height: 1, width: size * 0.22, background: 'rgba(139,105,20,0.5)' }}
          />
          <span
            className="font-mono-label"
            style={{ fontSize: size * 0.045, letterSpacing: '0.24em', color: '#8b6914' }}
          >
            FAIR LAUNCH
          </span>
        </div>
      </div>
    </div>
  )
}
