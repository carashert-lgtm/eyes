# Eyes Open — Brand assets checklist

Assets needed before public presale announcement. Mark status as you produce files.

---

## Summary

| Asset | Spec | Site today | Status |
|-------|------|------------|--------|
| Profile picture (X / TG) | 512×512 PNG, readable at 32px | Not used as upload — **SVG mark in UI only** | **Needed** |
| Header / banner (X) | 1500×500 PNG | Not on site | **Needed** |
| Coin / token image | 512×512 PNG, square | Not on site (text `$EYES` only) | **Needed** |
| Favicon | 32×32 / 48×48 ICO or PNG | `web/public/icon.svg` (generic) | **Replace** |
| OpenGraph / social preview | 1200×630 PNG | Metadata only — **no image set** | **Needed** |
| App icon (PWA / mobile) | 192×192 + 512×512 PNG | Not configured | **Needed** |
| Logo mark (nav) | SVG | `web/components/ui/EyeMark.tsx` (inline SVG) | **In use** |
| Placeholder logo | SVG | `web/public/placeholder-logo.svg` | Dev placeholder |

---

## 1. Profile picture (X, Telegram, Discord)

- **Format:** PNG 512×512 (min), transparent or dark background
- **Content:** Eye mark + optional wordmark; legible at avatar size
- **Site:** Header/footer use `EyeMark` component — export a matching PNG for socials
- **Status:** [ ] Final PNG exported

---

## 2. Header / banner (X)

- **Format:** 1500×500 PNG or JPG
- **Content:** Slogan *Eyes Open. No Snipers. No Games.* + subtle gold accent (match site `#d4af37`)
- **Site:** Not embedded — social only
- **Status:** [ ] Banner designed and uploaded to X

---

## 3. Coin / token image ($EYES)

- **Format:** PNG 512×512 (CoinGecko / wallets / presale UI future)
- **Content:** Distinct $EYES mark; not generic eye clip art
- **Site:** Presale panel shows ETH send only — no coin image yet
- **Status:** [ ] Coin image finalized

---

## 4. Favicon

- **Current:** `web/public/icon.svg` — minimal placeholder
- **Target:** Replace with brand favicon; Next.js picks up `app/icon.png` or `public/favicon.ico`
- **Action:** Add `web/app/icon.png` (32×32+) or `web/public/favicon.ico`
- **Status:** [ ] Production favicon added

---

## 5. OpenGraph image (link previews)

- **Format:** 1200×630 PNG
- **Current:** `web/app/layout.tsx` — OpenGraph title/description only, **no `images`**
- **Target:** Add `web/app/opengraph-image.png` or metadata `openGraph.images`
- **Content:** Logo + slogan + `$EYES` + eyesopen.to
- **Status:** [ ] OG image created and wired in layout metadata

---

## 6. App icons (optional PWA)

- **Format:** 192×192 and 512×512 PNG
- **Current:** Not configured (`manifest` not present)
- **Status:** [ ] Only if mobile install / PWA planned for launch

---

## 7. In-site brand (already in use)

| Element | Location | Notes |
|---------|----------|--------|
| Eye mark SVG | `EyeMark.tsx`, Header, Footer, AppShell | **Live** |
| Typography | Syne + IBM Plex (Google Fonts in layout) | **Live** |
| Gold accent | CSS `--primary` / tokenomics | **Live** |
| Spinning coin | `SpinningCoin.tsx` | Decorative — not official coin image |

---

## File drop locations (when ready)

```
web/public/
  favicon.ico          # or use app/icon.png
  og-image.png         # 1200×630
  eyes-coin-512.png    # token image

web/app/
  icon.png             # Next.js App Router favicon
  opengraph-image.png  # Auto OG (optional)
```

---

## Sign-off

| Asset pack | Owner | Target date | Done |
|------------|-------|-------------|------|
| Social (PFP + banner) | | | [ ] |
| Coin + favicon + OG | | | [ ] |
| Wired in Next.js metadata | | | [ ] |
