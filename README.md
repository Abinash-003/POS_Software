# Supermarket POS — Billing, Stock & Expense Tracking

A bilingual (English / தமிழ்) point-of-sale and expense tracking system for a family run
provisional supermarket. Bills are recorded for **internal stock and expense tracking**, and can
still be printed or saved as PDF for any customer who asks.

Built as a classic **MERN** stack: MongoDB (Atlas) · Express · React (Vite) · Node.js.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project layout](#project-layout)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Design notes](#design-notes)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)

---

## What it does

| Area | Details |
| --- | --- |
| **Dashboard** | Today's revenue, net profit, expenses and units sold; 7-day revenue chart; restock list; recent bills; week / month / all-time roll-ups |
| **Quick Sale (POS)** | Search or scan by name, Tamil name, SKU or barcode → cart with per-line quantity control → discount → payment method → one tap to complete. Cart survives an accidental refresh |
| **Billing** | A4 bill with shop header and logo, line items, totals and footer. Print or download as PDF. Admins can void a bill, which returns the units to stock |
| **Products** | Full catalogue with **product photos**, bilingual names, category, brand, SKU, barcode, purchase and selling price, stock, unit and low-stock threshold |
| **Stock In** | Record purchases with supplier, date, notes and an **invoice photo**. Stock is incremented atomically and the purchase price is updated |
| **Low Stock** | Out-of-stock and running-low products, each linking straight to a pre-filled Stock In form |
| **Expenses** | Electricity, rent, transport, staff, maintenance and other costs, with an optional **receipt photo** |
| **Statistics** | Revenue / profit trend, payment method split, busiest hours, best sellers, slow movers and never-sold products |
| **Reports** | `Revenue − Cost of Goods Sold − Expenses = Estimated Profit` waterfall, stock-on-hand valuation, and CSV exports |
| **Settings** | Language, shop name / address / phone / GSTIN / **logo**, and bill footer — all bilingual |
| **Users** | Admin and staff roles, enable/disable accounts, password resets |
| **Language** | Instant English ⇄ Tamil switch from any screen, remembered in `localStorage`. No hardcoded strings |

### Roles

| Capability | Admin | Staff |
| --- | :---: | :---: |
| Sell, bill, print | ✔ | ✔ |
| Record expenses | ✔ | ✔ |
| View reports & statistics | ✔ | ✔ |
| Create / edit / delete products | ✔ | — |
| Stock In, categories | ✔ | — |
| Void bills | ✔ | — |
| Manage users & shop settings | ✔ | — |

---

## Tech stack

**Backend** — Node.js, Express 4, Mongoose 8, JSON Web Tokens in an httpOnly cookie, bcrypt,
Multer for image uploads, Helmet, CORS, compression, rate limiting on login.

**Frontend** — React 18, Vite 6, React Router 6, Tailwind CSS 4, `react-icons`, Recharts,
Axios, jsPDF + `html2canvas-pro`.

No emoji anywhere in the interface — every glyph is a `react-icons` component.

---

## Getting started

Requires **Node.js 18.18+** and a MongoDB connection string.

```bash
# 1. install root, server and client dependencies
npm run install:all

# 2. create the env files (see the next section)
#    server/.env  and  client/.env

# 3. start the API and the UI together
npm run dev
```

| Service | URL |
| --- | --- |
| UI | http://localhost:5173 |
| API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

The Vite dev server proxies `/api` and `/uploads` to the backend, so the browser stays on a single
origin and the auth cookie works with no CORS configuration.

### First sign-in

The first time the server boots against an empty database it creates the owner account and ten
starter categories:

```
username: admin
password: admin123
```

Change the password from **Settings → Users** straight away.

### Individual scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + UI with hot reload |
| `npm run dev:server` | API only |
| `npm run dev:client` | UI only |
| `npm run build` | Production bundle into `client/dist` |
| `npm start` | Run the API in production mode |
| `npm run seed` | Re-run the idempotent bootstrap (admin, categories, shop profile) |
| `npm run seed:demo` | Fill the database with a fortnight of sample trading |
| `npm run seed:reset` | Delete all products, stock-in, bills and expenses |
| `npm run lint` | ESLint over the client |

### Sample data

A brand-new database has no products, so the dashboard, statistics and reports
all start empty. To see them populated:

```bash
npm run seed:demo
```

That creates 14 bilingual products, two rounds of stock-in, around 260 bills
spread over the last 14 days (weekends busier), a handful of expenses, and
leaves a few products in the low / out-of-stock band so the alerts screen has
something to show.

When you are ready to start entering your own shop's data:

```bash
npm run seed:reset
```

This clears every product, stock-in entry, bill and expense. Your login
accounts and shop settings are kept.

---

## Environment variables

Copy `.env.example` and split it into the two files below.

### `server/.env`

| Variable | Required | Notes |
| --- | :---: | --- |
| `MONGODB_URI` | yes | Include the database name in the path, e.g. `.../supermarket_pos` |
| `JWT_SECRET` | yes | Long random string. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | no | Defaults to `5000` |
| `NODE_ENV` | no | `development` or `production` |
| `JWT_EXPIRES_IN` | no | Defaults to `7d` |
| `COOKIE_NAME` | no | Defaults to `sm_token` |
| `CLIENT_ORIGIN` | no | Comma separated allowed browser origins |
| `MAX_UPLOAD_MB` | no | Per-image limit, defaults to `4` |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | no | Used only when the database has no users |

The server exits immediately with a clear message if `MONGODB_URI` or `JWT_SECRET` is missing.

### `client/.env`

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Leave blank to use the dev proxy. Set to a full URL (e.g. `https://api.example.com/api`) when the API is on another host |

---

## Project layout

```
.
├── server/
│   ├── src/
│   │   ├── config/        env validation, Mongo connection
│   │   ├── models/        User, Category, Product, Purchase, Sale, Expense, Setting, Counter
│   │   ├── middleware/    auth (JWT), image upload, error handler
│   │   ├── controllers/   one per resource
│   │   ├── routes/        Express routers
│   │   ├── services/      first-boot bootstrap
│   │   ├── utils/         ApiError, async wrapper, date ranges, input coercion
│   │   ├── app.js         middleware pipeline
│   │   └── server.js      boot + graceful shutdown
│   └── uploads/           product photos, receipts, invoices, logo
│
└── client/
    └── src/
        ├── i18n/          en.json, ta.json, LanguageProvider
        ├── context/       Auth, Toast, Confirm, Settings
        ├── hooks/         useFetch, useDebounced, useApiError
        ├── lib/           axios client, formatting, CSV, PDF
        ├── components/
        │   ├── ui/        Button, Card, Field, Modal, Badge, Spinner, Skeleton, ImagePicker…
        │   ├── layout/    AppLayout, navigation, LanguageToggle
        │   ├── products/  ProductFormModal
        │   ├── billing/   BillReceipt
        │   └── filters/   RangeFilter
        ├── pages/         one per screen
        ├── App.jsx        routes and guards
        └── main.jsx       provider composition
```

---

## API reference

All routes are prefixed with `/api`. Every route except `/health`, `/auth/login` and
`/auth/logout` requires the auth cookie. Routes marked **admin** require the admin role.

### Auth

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/auth/login` | Rate limited to 30 attempts per 10 minutes |
| `POST` | `/auth/logout` | Clears the cookie |
| `GET` | `/auth/me` | Current user |
| `GET` | `/auth/users` | **admin** |
| `POST` | `/auth/users` | **admin** |
| `PUT` | `/auth/users/:id` | **admin** |
| `DELETE` | `/auth/users/:id` | **admin**, refuses self-deletion and the last admin |

### Products & categories

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/products` | `?q=&categoryId=&status=in\|low\|out&limit=` |
| `GET` | `/products/alerts/low-stock` | Low and out-of-stock lists |
| `GET` | `/products/:id` | |
| `POST` | `/products` | **admin**, `multipart/form-data`, field `image` |
| `PUT` | `/products/:id` | **admin**, `multipart/form-data`, `removeImage=true` clears the photo |
| `DELETE` | `/products/:id` | **admin** |
| `GET` | `/categories` | Includes a product count per category |
| `POST` `PUT` `DELETE` | `/categories[/:id]` | **admin**; deleting a category leaves its products uncategorised |

### Sales, stock and expenses

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/sales` | `?range=today\|yesterday\|week\|month\|all\|custom&from=&to=&payment=&q=` plus a period summary |
| `POST` | `/sales` | `{ items: [{ product, quantity }], paymentMethod, discount, customerName, customerPhone }` |
| `GET` | `/sales/:id` | Bill with line items |
| `DELETE` | `/sales/:id` | **admin**, voids the bill and restores stock |
| `GET` | `/purchases` | Stock-in ledger with a spend summary |
| `POST` | `/purchases` | **admin**, `multipart/form-data`, field `image` for the invoice photo |
| `GET` | `/purchases/:id` | |
| `GET` `POST` `PUT` `DELETE` | `/expenses[/:id]` | `multipart/form-data`, field `image` for the receipt |

### Insights & settings

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/dashboard` | Today / week / month / all-time buckets, alerts, recent bills, 7-day trend |
| `GET` | `/reports/profit` | Revenue, cost, expenses, estimated profit |
| `GET` | `/reports/sales` | Daily series, payment split, hourly distribution |
| `GET` | `/reports/products` | Best sellers, slow movers, never sold, inventory valuation |
| `GET` | `/settings` | Shop profile |
| `PUT` | `/settings` | **admin**, `multipart/form-data`, field `image` for the logo |
| `GET` | `/health` | Database connection state and uptime |

### Error format

Errors return a **translation key**, not a sentence, so the UI can render it in either language:

```json
{ "error": "insufficient",
  "details": { "nameEn": "Aavin Milk 500ml", "available": 26, "requested": 9999 } }
```

Keys map to `errors.*` in `client/src/i18n/{en,ta}.json`.

---

## Data model

```
User      username · passwordHash · role(admin|staff) · name · active · lastLoginAt
Category  nameEn · nameTa
Product   nameEn · nameTa · category → Category · brand · sku(unique) · barcode(unique, sparse)
          purchasePrice · sellingPrice · stock · minimumStock · unit · image
Purchase  product → Product · quantity · purchasePrice · totalCost · supplier · date
          stockBefore · stockAfter · invoiceImage · createdBy → User
Sale      billNumber(unique) · items[] · itemsCount · unitsCount · subtotal · discount
          total · cost · profit · paymentMethod · customer… · createdBy → User
          items[]: product · nameEn · nameTa · sku · unit · quantity
                   sellingPrice · purchasePrice · total · profit
Expense   name · amount · category · date · notes · receiptImage · createdBy → User
Setting   singleton: shop names, address, phone, GSTIN, logo, bill footer (EN + TA)
Counter   per-day sequence backing gap-free bill numbers
```

Sale line items are **embedded**, not referenced, so a bill printed today still shows the exact
name, unit and price that were charged even if the product is later renamed, repriced or deleted.

---

## Design notes

**Mobile first.** Every screen is laid out for a phone held one-handed: a five-item bottom bar with
a "More" sheet, 44px+ touch targets, horizontally scrolling filter pills, and bottom-sheet modals
that become centred dialogs from the `sm` breakpoint. The sidebar only appears at `lg` and above.

**Light blue theme.** Brand, neutral and semantic colour ramps are declared as Tailwind 4
`@theme` tokens in `client/src/styles/index.css`. They are written in plain hex on purpose: the
bill is rasterised for the PDF export, and canvas renderers mishandle modern colour functions.

**Selling can never oversell.** Each line is decremented with a guarded atomic update
(`{ _id, stock: { $gte: qty } }` + `$inc: -qty`), so two tills cannot sell the same unit. If any
line fails, or the bill cannot be written, every applied decrement is compensated. This keeps the
flow correct on standalone MongoDB, where multi-document transactions are unavailable.

**Bill numbers are sequential**, not random: a `Counter` document is incremented atomically to
produce `BILL-20260926-0001`, which is easier to read out over a phone and cannot collide.

**Loading and feedback.** First loads show shimmer skeletons shaped like the content they replace;
background refreshes show a thin indeterminate bar so data never jumps without warning. All
feedback goes through a toast provider (stack capped at three) and a promise-based confirm dialog
that replaces `window.confirm`.

**Tamil typography.** The UI loads Noto Sans Tamil and raises line height when `<html lang="ta">`,
because Tamil glyphs need more vertical room than Latin. CSV exports are written with a BOM so
Tamil survives being opened in Excel.

**Images.** Uploads are validated by MIME type and size, stored under `server/uploads/<kind>/` with
a random filename, and served with a long cache header. Replacing or deleting a record removes the
old file from disk, and a failed write cleans up the file it just uploaded.

---

## Production build

```bash
npm run build          # bundles the UI into client/dist
npm start              # serves the UI and the API together on PORT
```

### Single server (recommended)

In production the Express server also serves `client/dist`, so the whole system runs from one
process on one port. Visit `http://<host>:5000` and you get the app; `/api/*` is the API and
every other path falls through to the React shell so deep links like `/billing/<id>` work on a
hard refresh. Because the UI and API share an origin there is no CORS to configure, and the
auth cookie works without `SameSite=None`.

Screens are code-split, so the first load pulls roughly 105 kB gzipped and the chart and PDF
libraries only download when someone opens statistics or saves a bill.

### Separate hosts

If you would rather host the UI on a static host, serve `client/dist` there, set
`VITE_API_URL` to the deployed API, and add the UI origin to `CLIENT_ORIGIN`. In this setup the
auth cookie is sent with `secure` and `SameSite=None`, so the API must be served over HTTPS.

Because uploads are written to the local disk, use a host with a persistent volume (a VPS or a
Docker volume) rather than a read-only serverless platform.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing required environment variable` | Create `server/.env` from `.env.example` |
| `port 5000 is already in use` | Stop the other process or change `PORT` in `server/.env` |
| Mongo connection times out | Allow your IP in the Atlas **Network Access** list and check the password in the URI |
| Login works but every other call returns 401 | Use the UI through the Vite dev server (port 5173), not by opening `index.html` directly |
| `Origin not allowed by CORS` | Add the browser origin to `CLIENT_ORIGIN` in `server/.env` |
| Photos do not appear | Confirm `server/uploads/` is writable and reachable at `/uploads/...` |
| PDF download fails | Use **Print → Save as PDF**; the print stylesheet produces the same layout |
