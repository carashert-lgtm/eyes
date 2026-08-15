import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type ContainerProps = {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
  id?: string
}

export function Container({
  children,
  className,
  as: Tag = 'div',
  id,
}: ContainerProps) {
  return (
    <Tag
      id={id}
      className={cn('mx-auto w-full max-w-6xl px-6 lg:px-8', className)}
    >
      {children}
    </Tag>
  )
}
