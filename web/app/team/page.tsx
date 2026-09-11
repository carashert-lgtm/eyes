import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/site-config'

export default function TeamIndexPage() {
  redirect(ROUTES.teamPool)
}
