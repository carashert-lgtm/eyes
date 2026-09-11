import NextAuth from 'next-auth'

/** Legacy NextAuth route — Google sign-in removed; Eyes email/password is the only account login. */
export const authEnabled = false

export const authBaseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/$/, '')

export const { handlers, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET?.trim() || 'disabled',
  providers: [],
})
