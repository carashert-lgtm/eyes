# Eyes account + embedded wallet

## Model

- **One email/password account → one embedded wallet** (same address every login)
- Wallet generated **client-side** on signup; encrypted with your password (PBKDF2 + AES-GCM)
- Server stores **password hash + encrypted blob only** — never plaintext private keys
- **No MetaMask, WalletConnect, or browser extension connectors**

## User flow

1. **Sign up** — `/app/profile` → email + password → wallet auto-created
2. **Return** — same email/password → same wallet unlocked in session
3. **Fund** — copy deposit address on profile; send $EYES on Base
4. **Discord** — generate link code → `!linkwallet EYES-…`
5. **Launch** — `/app/create` pays fees + deploys from embedded wallet
6. **Backup** — Profile → Export private key (password re-auth)
7. **Logout** — ends session; wallet remains on account

## Env (Vercel)

| Variable | Required |
|----------|----------|
| `BOT_WEBHOOK_URL` | Yes |
| `PLATFORM_API_SECRET` | Yes |
| `TEAM_SESSION_SECRET` or `PLATFORM_API_SECRET` | Yes (session cookies) |
| `NEXT_PUBLIC_EYES_TOKEN_ADDRESS` | Yes |
| `NEXT_PUBLIC_CHAIN_ID` | `8453` |
| `BASE_MAINNET_RPC_URL` | Recommended |

## Env (Railway bot)

Same as before + new webhook routes:

- `POST /webhook/eyes-account/signup`
- `POST /webhook/eyes-account/auth`
- `POST /webhook/eyes-account/me`

## Unfinished

- Passkey / WebAuthn unlock
- Email OTP / magic link
- Optional Google/Apple social mapped to same wallet account
- Spending confirmations on large sends
