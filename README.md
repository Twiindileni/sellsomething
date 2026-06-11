# Sell Something 🛒
Namibia's buy & sell marketplace — React + Node.js + Axios + Supabase.

---

## Project Structure
```
sell-something/
├── client/              # React frontend (Create React App)
│   └── src/
│       ├── components/  # Navbar, ProductCard
│       ├── context/     # ProductContext (global state)
│       ├── pages/       # Home, ListingDetail, SellPage
│       └── services/    # api.js — all Axios calls
├── server/
│   ├── index.js         # Express REST API → Supabase
│   ├── .env             # Your Supabase credentials (git-ignored)
│   └── .env.example     # Template for other devs
└── supabase/
    └── schema.sql       # Run this once in Supabase SQL Editor
```

---

## 1. Set up Supabase Database

1. Go to https://supabase.com → open your project
2. Click **SQL Editor** → **New Query**
3. Paste the contents of `supabase/schema.sql` and click **Run**

This creates:

| Table / object | Purpose |
|----------------|---------|
| `auth.users` | Built-in — stores login credentials (email + password) |
| `public.profiles` | App user data (name, email) — one row per registered user |
| `public.products` | Marketplace listings (optional `seller_id` → profiles) |

**Already ran an older `schema.sql`?** Run `supabase/auth.sql` instead to add profiles + signup trigger without recreating products.

### Enable email login & register

In Supabase Dashboard → **Authentication** → **Providers** → enable **Email**.

Sign up from the app should pass the display name in metadata:

```js
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: name } },
});
```

A database trigger then inserts into `public.profiles` automatically.

### Product images (Storage)

1. Run `supabase/storage.sql` in the SQL Editor (creates the `product-images` bucket and upload policies).
2. Run `supabase/images.sql` to allow **up to 4 photos** per listing (`images` array column).

Logged-in users can upload multiple photos when posting an ad. Listings show a thumbnail gallery and full-screen viewer.

---

## 2. Install & Run

```bash
# Install all dependencies
npm run install:all

# Start both frontend + backend
npm run dev
```

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5000/api

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all (`?search=&category=`) |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create listing |
| PUT | `/api/products/:id` | Update listing |
| DELETE | `/api/products/:id` | Delete listing |
| GET | `/api/categories` | All categories |

### POST body example
```json
{
  "title": "Samsung Galaxy S22",
  "description": "Great condition",
  "price": 8500,
  "category": "Electronics",
  "location": "Windhoek",
  "seller": "John N.",
  "seller_email": "john@example.com"
}
```

---

## Environment Variables

**`server/.env`**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-publishable-key
PORT=5000
```

**`client/.env`** (copy from `client/.env.example` — restart `npm run dev` after changes)
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_KEY=your-supabase-publishable-key
```

---

## Features
- 🔍 Search by keyword, filter by 8 categories
- 📝 Post listings with price in N$ (Namibian Dollars)
- 📧 Contact seller via email
- 🏙️ Namibian cities: Windhoek, Walvis Bay, Swakopmund, and more
- 🗄️ Supabase PostgreSQL backend — ready for auth, storage & more
