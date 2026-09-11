export type EmailAlertPrefs = {
  launches: boolean
  presale: boolean
  season: boolean
}

export type AppAccount = {
  id: string
  googleId: string | null
  email: string
  name: string | null
  image: string | null
  walletAddress: string | null
  discordId: string | null
  emailAlerts: EmailAlertPrefs
  createdAt: string
  updatedAt: string
}

export type AccountLinkSummary = {
  walletLinked: boolean
  discordLinked: boolean
  presaleContributions: number
  teamPoolUser: boolean
  seasonPoints: number | null
}

export type AccountProfile = {
  account: AppAccount
  links: AccountLinkSummary
}

export const DEFAULT_EMAIL_ALERTS: EmailAlertPrefs = {
  launches: true,
  presale: true,
  season: true,
}
