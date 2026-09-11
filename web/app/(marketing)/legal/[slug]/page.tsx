import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalDocumentView } from '@/components/legal/LegalDocumentView'
import { getLegalDocument, LEGAL_DOCUMENTS } from '@/lib/legal'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const doc = getLegalDocument(slug)
  if (!doc) return { title: 'Trust & Legal | Eyes Open' }
  return {
    title: `${doc.title} | Eyes Open`,
    description: doc.description,
  }
}

export default async function LegalSlugPage({ params }: PageProps) {
  const { slug } = await params
  const doc = getLegalDocument(slug)
  if (!doc) notFound()
  return <LegalDocumentView document={doc} />
}
