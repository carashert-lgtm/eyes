import { cn } from '@/lib/utils'

export function EyeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="7"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <path
        d="M6 20C9.5 13.5 14.2 10 20 10C25.8 10 30.5 13.5 34 20C30.5 26.5 25.8 30 20 30C14.2 30 9.5 26.5 6 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="5.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  )
}
