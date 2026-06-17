# SellSomething — Agent Handoff (read this first)

Namibian marketplace (OLX/Gumtree style) with escrow. **When starting a new chat, read this file before making changes.**

## Repo & stack

- **Frontend:** `client/` — React (CRA), port 3000
- **Backend:** `server/index.js` — Express, port 5000; Vercel uses `api/index.js`
- **Mobile:** `IOS/` (SwiftUI WebView wrapper), `android/` (Kotlin WebView wrapper) — both load www.sellsomething.online
- **DB/Auth:** Supabase (PostgreSQL + Auth)
- **Styles:** `client/src/App.css` — use CSS variables (`--accent`, `--success`, `--ink`, etc.)

## What is built (as of commit on `main`)

### Core
- Listings, auth, dashboard, sell page, professionals directory

### Escrow system
- `BuyNowModal.js` — 3-step purchase flow
- `BuyerOrderTracking.js` — buyer live courier-style tracker + confirm & rate + refund
- `SellerOrderTracking.js` — seller dispatch tracker + ETA + mark delivered
- `AdminPage.js` — admin order management at `/admin`
- `client/src/utils/orderHelpers.js` — ETA, tracking steps
- `client/src/config/payment.js` — payment details from env

### Order status flow
```
pending_payment → payment_received → in_delivery → delivered → confirmed → completed
                                                              ↘ disputed → refunded
```

- **Admin:** confirms `pending_payment` → `payment_received`; releases payout `confirmed` → `completed`
- **Seller:** updates delivery (ETA, progress notes, handed over) — buyer tracker syncs every ~8s; seller cannot confirm receipt for buyer
- **Buyer:** only person who can confirm receipt (`delivered` → `confirmed`) with 1–5 star rating; can request refund if ETA missed
- **Admin:** cannot set `confirmed` — only buyer can; admin releases payout `confirmed` → `completed`

### Auth fixes
- `AuthContext.js` — `profileLoading` separate from auth loading; no blocking login on profile fetch

### Admin API fix
- `server/index.js` — `requireAdmin()`, uses `SUPABASE_SERVICE_ROLE_KEY` OR RPC functions
- **Must run** `supabase/admin_orders.sql` in Supabase SQL Editor (RLS was blocking admin seeing orders)

## SQL migrations to run (Supabase SQL Editor)

Run in order if not already done:

1. `supabase/escrow_migration.sql` — orders table, is_admin, RLS, admin RPC
2. `supabase/admin_orders.sql` — admin RLS + RPC (if escrow already run, run this alone)
3. `supabase/delivery_eta_migration.sql` — `delivery_eta`, `delivery_eta_note`
4. `supabase/order_tracking_migration.sql` — timestamps + `buyer_rating`, `buyer_review`
5. `supabase/seller_updates_migration.sql` — `seller_latest_update`, `seller_latest_update_at`
6. `supabase/boost_migration.sql` — sponsored boosts table + `is_boosted` on products/employees

Set admin:
```sql
UPDATE profiles SET is_admin = TRUE WHERE email = 'your-admin@email.com';
```

## Environment variables

**client/.env**
```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_KEY=
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_PAYMENT_CELL=+264 81 78 545 73
REACT_APP_PAYMENT_BANK_NAME=Sheka Investment CC
REACT_APP_PAYMENT_BANK=FNB
REACT_APP_PAYMENT_BANK_ACCOUNT=62262406674
```

**server/.env**
```
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # recommended for admin on Vercel
PORT=5000
```

## Run locally

```bash
npm run install:all
npm run dev
```

## Known issues / next features (not done)

- Email/SMS notifications on status change
- Payment proof upload (screenshot in Supabase Storage)
- Mark listing as sold when order placed
- Seller payout tracking fields (`paid_at`, `payout_amount`) — partial via `seller_paid_at`
- Cursor chat history does NOT sync between computers — use this file + git

## Key files map

| Area | Files |
|------|-------|
| Buyer tracking | `client/src/components/BuyerOrderTracking.js` |
| Seller tracking | `client/src/components/SellerOrderTracking.js` |
| Dashboard tabs | `client/src/pages/DashboardPage.js` |
| Admin | `client/src/pages/AdminPage.js` |
| Order API | `server/index.js` (`/api/orders/*`) |
| API client | `client/src/services/api.js` |

## Continuing work

User may say: *"Read AGENTS.md and continue SellSomething escrow work."*  
Do not re-explain from scratch — check git log, read key files above, ask what they want next.
