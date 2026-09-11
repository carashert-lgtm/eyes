# Eyes Open — Production brand kit (execute now)

Audit date: Launch Prep · Brand pass.  
Site reference: `web/` on eyesopen.to.

---

## Site audit — what exists today

| Asset | On website? | Where | Verdict |
|-------|-------------|-------|---------|
| Logo mark | **Yes** | `EyeMark.tsx` → Header, Footer, AppShell | Live SVG — export PNG from this for social PFP |
| Hero “coin” | **CSS only** | `SpinningCoin.tsx` on landing hero | Decorative — **not** a real image file |
| Favicon | **Placeholder** | `public/icon.svg` (generic) | **Replace before announce** |
| OpenGraph preview | **Missing** | `app/layout.tsx` has title/desc only, no image | **Required** |
| $EYES coin PNG | **No** | Presale uses text `$EYES` only | **Required** (social + future UI) |
| X PFP / banner | **N/A** | Upload to X only | **Required** (not in repo) |
| Typography / colors | **Yes** | Syne + IBM Plex; gold `#a97f12` / `#d4af37` | Use in all exports |
| `placeholder-logo.svg` | Unused in UI | `public/` | Dev only — ignore |

---

## Required now (before public presale announce)

| # | Asset | Spec | Generate as | Upload / place |
|---|--------|------|-------------|----------------|
| 1 | **X profile picture** | **512×512 PNG**, square, readable at 32px | `eyes-pfp-512.png` | Upload to X — **not** in repo |
| 2 | **X header / banner** | **1500×500 PNG** (or JPG ≤5MB) | `eyes-x-banner-1500x500.png` | Upload to X — **not** in repo |
| 3 | **$EYES coin image** | **512×512 PNG**, transparent or cream `#faf7f0` bg | `eyes-coin-512.png` | `web/public/brand/eyes-coin-512.png` |
| 4 | **Favicon** | **32×32** min (export **48×48** + **180×180** too) | `icon.png` | `web/app/icon.png` (Next.js auto) |
| 5 | **OpenGraph image** | **1200×630 PNG**, safe zone center | `opengraph-image.png` | `web/app/opengraph-image.png` (Next.js auto) |

**Design brief (all assets):**
- Mark: match `EyeMark` (rounded square + eye) or hero coin face (“EYES OPEN / $EYES”)
- Colors: gold `#a97f12`, accent `#d4af37`, background `#faf7f0`, text `#1c1917`
- Slogan (banner/OG): *Eyes Open. No Snipers. No Games.*
- URL on OG only: `eyesopen.to`

---

## Optional later

| Asset | Spec | When | Place |
|-------|------|------|-------|
| Telegram channel photo | 512×512 PNG (same as PFP) | When TG goes public | Telegram only |
| Apple touch icon | 180×180 PNG | Nice polish | `web/app/apple-icon.png` |
| PWA icons | 192×192 + 512×512 PNG | If “Add to Home Screen” | `web/public/` + manifest |
| Presale panel coin thumb | 64×64 or 128×128 PNG | UI polish | Reference `/brand/eyes-coin-512.png` |
| Token list / wallet logo | 512×512 PNG (same coin) | CEX / CoinGecko listing | External submissions |

---

## Files to generate (your task list)

```
[ ] eyes-pfp-512.png              → X profile (512×512)
[ ] eyes-x-banner-1500x500.png    → X header (1500×500)
[ ] eyes-coin-512.png             → web/public/brand/eyes-coin-512.png
[ ] icon.png                      → web/app/icon.png (32–48px source, export sharp)
[ ] opengraph-image.png           → web/app/opengraph-image.png (1200×630)
```

Optional exports from same master:
```
[ ] apple-icon.png                → web/app/apple-icon.png (180×180)
```

---

## Where each file goes in the repo

```
web/
├── app/
│   ├── icon.png                 ← favicon (browser tab)
│   ├── opengraph-image.png      ← link previews (iMessage, X, Telegram, Slack)
│   └── apple-icon.png           ← optional iOS home screen
└── public/
    └── brand/
        └── eyes-coin-512.png    ← token image (future presale UI, docs, listings)
```

**Social-only (do not commit unless you want backups):**
- X PFP → twitter.com settings
- X banner → twitter.com settings

After adding `app/icon.png` and `app/opengraph-image.png`, redeploy — Next.js picks them up automatically (no code change required).

---

## Execute in order (~30 min design + upload)

1. **Export PFP** from Figma/Canva using EyeMark + gold on `#faf7f0` → upload to X `@eyesopenlaunch`
2. **Export X banner** 1500×500 with slogan + subtle gold glow → upload to X header
3. **Export coin** 512×512 (flat or slight 3D, match hero coin) → save to `web/public/brand/eyes-coin-512.png`
4. **Export favicon** from coin or mark → save as `web/app/icon.png`
5. **Export OG** 1200×630: logo + slogan + `$EYES` + eyesopen.to → save as `web/app/opengraph-image.png`
6. **Verify:** `npm run build` in `web/`, deploy preview, share link in iMessage/X DM — confirm image appears
7. **Check tab icon** on eyesopen.to after deploy

---

## Sign-off

| Pack | Done |
|------|------|
| X PFP + banner uploaded | [ ] |
| `web/app/icon.png` | [ ] |
| `web/app/opengraph-image.png` | [ ] |
| `web/public/brand/eyes-coin-512.png` | [ ] |
| Link preview tested on production | [ ] |

See also: [`BRAND_ASSETS_CHECKLIST.md`](BRAND_ASSETS_CHECKLIST.md) (detailed reference).
