export type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export type LegalDocument = {
  slug: string
  title: string
  description: string
  summary: string
  sections: LegalSection[]
}
