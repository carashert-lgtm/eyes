# Eyes Open — Landing Page

Public marketing site for **Eyes Open ($EYES)**.

## Run locally

```powershell
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build for production

```powershell
npm run build
npm start
```

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 3
- Syne + IBM Plex Sans (Google Fonts)

## Structure

```
web/
├── app/
│   ├── page.tsx            # Landing page
│   └── tokenomics/
│       └── page.tsx        # Tokenomics page
├── components/
│   ├── layout/             # Header, Footer
│   ├── sections/           # Landing page sections
│   ├── tokenomics/         # Tokenomics page sections
│   └── ui/                 # Reusable UI primitives
└── lib/
    ├── cn.ts
    └── nav.ts              # Shared navigation links
```
