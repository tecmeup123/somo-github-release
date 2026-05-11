# SoMo — Claude Code Guide

## What This Project Is
SoMo ("Social Movement") is a pixel-based NFT governance game on Nervos CKB. Users claim one of 2,500 pixels on a 50×50 grid as a Spore DOB/0 NFT. Each pixel earns governance points toward a 350M token airdrop (snapshot March 31 2026) and grants voting power. Center pixels are highest tier/cost/reward.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Wouter routing, TanStack Query v5 |
| Styling | Tailwind CSS 3 + Radix UI (shadcn/ui) + Framer Motion |
| Blockchain | Nervos CKB · CCC Connector React · Spore Protocol (NFT) |
| Backend | Express.js + Drizzle ORM + PostgreSQL (Neon serverless) |
| Real-time | WebSocket (`ws`) via `/ws` endpoint |

---

## Architecture

```
somo-github-release/
├── client/src/
│   ├── pages/          # Route-level pages (landing, home, my-pixels, leaderboard, admin)
│   ├── components/
│   │   ├── canvas/     # PixelCanvas, PixelGrid, PixelClaimModal, CanvasPreview, …
│   │   ├── layout/     # Header, Navigation, MobileLayout
│   │   ├── wallet/     # WalletProvider, WalletModal
│   │   └── ui/         # shadcn/ui primitives (do not edit these)
│   ├── hooks/          # usePixelData, use-toast, use-mobile
│   ├── types/          # pixel.ts — PixelData, CanvasStats
│   ├── lib/            # queryClient, spore-mint, spore-transfer, spore-melt
│   └── index.css       # Global CSS + design tokens
├── server/
│   └── features/       # pixels, users, stats, governance, clusters, transactions, admin, sync
├── shared/
│   ├── canvas-utils.ts     # Tier calc, price, color — SINGLE SOURCE OF TRUTH
│   ├── governance-utils.ts # Points multipliers, token economics
│   └── schema.ts           # Drizzle DB schema
└── CLAUDE.md
```

---

## Non-Negotiable Rules

### Never break these
1. **Tier calculation** lives only in `shared/canvas-utils.ts` — `calculateTierFromDistance`, `getManhattanDistance`. Do not duplicate this logic anywhere.
2. **One pixel per wallet** — enforced server-side. Don't add UI that implies otherwise.
3. **Protected routes** (`/app`, `/my-pixels`, `/leaderboard`, `/admin`) require wallet connection via `ProtectedRoute`. Never remove this guard.
4. **Real pixel data comes from `/api/pixels`** — never substitute mock data on authenticated screens.
5. **CKB amounts** — always use `formatCKB()` from `@/utils/formatting` when displaying to users. Raw CKB values are in Shannon (1 CKB = 10^8 Shannon) at the API layer.
6. **DB schema changes** require a Drizzle migration (`npm run db:push` for dev, proper migration for prod). Never edit `schema.ts` without running migrations.

### Styling rules
- **Tailwind-first** — use utility classes. Add custom CSS to `index.css` only when Tailwind can't express it.
- **Design tokens**: `--primary` (cyan `#09D3FF`), `--font-display` (Orbitron), `--font-mono` (JetBrains Mono). Always use CSS variables, never hardcode these.
- **Tier colors** — use `getTierColor(tier)` from `@shared/canvas-utils`. Never hardcode tier hex values in components (exception: inline styles on the landing page static preview are acceptable).
- **Dark theme only** — the `.dark` class is applied at the root. Don't add light-mode code.
- **No inline styles on pixel-heavy components** — `PixelGrid` uses CSS classes for performance.

### Blockchain/wallet rules
- **Never expose private keys** — the CCC connector handles signing; never touch key material.
- **Spore operations** (mint, transfer, melt) are in `client/src/lib/`. Each has a prepare → sign → broadcast flow. Don't shortcut this.
- **Gas/fee estimates** — always show users the fee before confirming. `PixelClaimModal` already does this; follow the same pattern.
- **Testnet only** for now — `ADMIN_WALLET_TESTNET` in `canvas-utils.ts`. Don't switch to mainnet constants without explicit instruction.

---

## Key Files Map

| What you want | File |
|---------------|------|
| Tier/price/color logic | `shared/canvas-utils.ts` |
| Governance points math | `shared/governance-utils.ts` |
| PixelData TypeScript type | `client/src/types/pixel.ts` |
| Main app router | `client/src/App.tsx` |
| Global styles + CSS vars | `client/src/index.css` |
| Canvas 50×50 renderer | `client/src/components/canvas/PixelGrid.tsx` |
| Mint modal (claim flow) | `client/src/components/canvas/PixelClaimModal.tsx` |
| API routes (pixels) | `server/features/pixels/routes.ts` |
| DB schema | `shared/schema.ts` |
| Spore mint helper | `client/src/lib/spore-mint.ts` |
| Static landing canvas | `client/src/components/canvas/CanvasPreview.tsx` |

---

## Design System Reference

### Colors
| Token | Hex | Use |
|-------|-----|-----|
| Legendary | `#DBAB00` | Gold – highest tier |
| Epic | `#FFBDFC` | Pink – second tier |
| Rare | `#09D3FF` | Cyan – third tier / primary accent |
| Common | `#66C084` | Green – base tier |

### Tier boundaries (Manhattan distance from center 25,25)
| Tier | Distance | Count | Price |
|------|----------|-------|-------|
| Legendary | ≤ 6 | 85 | 100,000 CKB |
| Epic | ≤ 12 | 228 | 50,000 CKB |
| Rare | ≤ 20 | 528 | 25,000 CKB |
| Common | > 20 | 1,659 | 5,000 CKB |

### Fonts
- **Display / headings**: `font-display` → Orbitron (loaded via Google Fonts preload in `index.html`)
- **Body**: `font-sans` → Inter
- **Mono / addresses / numbers**: `font-mono` → JetBrains Mono

---

## Common Patterns

### Adding a new page
1. Create `client/src/pages/my-page.tsx`
2. Add a `<Route path="/my-page">` in `client/src/App.tsx`
3. Wrap with `<ProtectedRoute>` if wallet connection is required
4. Add nav link in `client/src/components/layout/Navigation.tsx`

### Fetching data
```tsx
const { data } = useQuery<MyType>({ queryKey: ['/api/endpoint'] });
```
The query key IS the URL — `apiRequest` is auto-configured in `queryClient.ts`.

### Mutations
```tsx
const mutation = useMutation({
  mutationFn: () => apiRequest('POST', '/api/endpoint', payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/pixels'] }),
});
```

### Showing a toast
```tsx
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Success", description: "Pixel claimed!" });
```

### Getting wallet address
```tsx
const signer = ccc.useSigner();
const address = await signer?.getRecommendedAddress();
```

---

## Development Commands

```bash
npm run dev        # Start dev server (client + server together, port 5000)
npm run build      # Production build
npm run db:push    # Push schema changes to DB (dev only)
```

---

## What NOT to Do

- Don't add a governance voting screen without a real API endpoint — the governance screen in the prototype is a UI mockup.
- Don't change pixel prices or tier boundaries without updating both `shared/canvas-utils.ts` AND the server-side validation.
- Don't use `any` type for `PixelData` — the type is fully defined in `client/src/types/pixel.ts`.
- Don't import from `data.js` (prototype file) — that file is from the standalone HTML prototype and has no place in this app.
- Don't remove `data-testid` attributes — they're used for automated testing.
- Don't use `console.log` in production code paths — use the existing error handling patterns.
- Don't create `.md` documentation files unless explicitly asked.

---

## Points System (for reference)

Points = Base × Monthly Multiplier × Tier Multiplier × Role Multiplier

| Factor | Value |
|--------|-------|
| Tier multiplier | Legendary 4×, Epic 2.5×, Rare 1.5×, Common 1× |
| Monthly multiplier | Dec 2025 2.0×, Jan 2026 1.5×, Feb 2026 1.25×, Mar 2026 1.0× |
| Original minter | 100% |
| Secondary holder | 25% |
| After transfer (seller) | 0% |

Snapshot: **March 31, 2026 at 23:59 UTC**. Every 4 points = 1 governance token.
