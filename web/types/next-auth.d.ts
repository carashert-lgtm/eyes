import 'next-auth'

declare module 'next-auth' {
  interface Session {
    googleId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    googleId?: string
  }
}
