import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { LaunchDetail } from '@/components/app/LaunchDetail'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Launch ${id} | Eyes Open ($EYES)`,
    description: 'Fair launch details, rankings, and $EYES boost visibility.',
  }
}

export default async function LaunchDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <AppShell>
      <LaunchDetail launchId={id} />
    </AppShell>
  )
}
