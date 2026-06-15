# ⏱ Hourly Tracker — Team Edition

> React + Node.js + Supabase. Track every hour with your team.

---

## 📦 Project Structure

```
hourly-tracker/
├── client/                  # React frontend (Vite)
│   ├── public/
│   │   ├── icons/           # App icons
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js            # Service worker
│   ├── src/
│   │   ├── api/             # API calls to server
│   │   ├── components/      # Shared components (Layout, modals)
│   │   ├── config/          # Supabase client
│   │   ├── context/         # Auth, Toast, Activities context
│   │   ├── lib/             # Helpers, constants, theme
│   │   ├── pages/           # Page components
│   │   └── styles/          # CSS
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                  # Node.js Express backend
│   ├── routes/
│   │   └── api.js           # AI proxy, health check
│   ├── index.js
│   ├── package.json
│   └── .env.example
├── supabase/
│   └── schema.sql           # Database schema + RLS policies
├── package.json             # Root scripts (dev:all)
└── .env.example
```

---

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. In **SQL Editor**, paste and run the contents of `supabase/schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
4. Create a **Storage bucket** called `avatars` (public) for profile photos
5. Go to **Authentication → Providers → Email** and enable it
6. (Optional) Go to **Authentication → Settings** and disable "Confirm email" or keep it on

### 2. Configure Environment

```bash
cp .env.example client/.env
cp .env.example server/.env
```

Edit both `.env` files with your Supabase credentials.

### 3. Install & Run

```bash
npm run install:all    # Install all dependencies (root + client + server)
npm run dev            # Runs client (port 5173) + server (port 3001) concurrently
```

Open **http://localhost:5173** in your browser.

---

## 🌐 Deployment

### Deploy to Vercel

**Client:**
- Import the `client/` folder as a new project
- Set framework to Vite
- Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Server:**
- Import the `server/` folder as a new project
- Add environment variables: `ANTHROPIC_API_KEY`
- Set build command to `npm install`
- Set output directory to `.`

Alternatively, deploy as a **monorepo** with a `vercel.json` at root.

### Deploy to Netlify

**Client:**
- Set base directory to `client/`
- Build command: `npm run build`
- Publish directory: `client/dist`
- Add environment variables for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Server:**
- Use Netlify Functions or deploy separately

---

## 🤖 AI Weekly Summaries

The server proxies Anthropic API calls (protects your API key):
1. Set `ANTHROPIC_API_KEY` in `server/.env`
2. Get a key from [console.anthropic.com](https://console.anthropic.com)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Lucide React |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + Auth) |
| Storage | Supabase Storage (avatars) |
| AI | Anthropic Claude (server-side proxy) |
| Export | ExcelJS |
| PWA | Service Worker + Manifest |
