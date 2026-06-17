# Nibus — Setup Guide

## 1. Install Node.js (one-time)

In your terminal:
```bash
sudo chown -R tstmarie /usr/local/lib/pkgconfig /usr/local/share/info /usr/local/share/man/man3 /usr/local/share/man/man5
chmod u+w /usr/local/lib/pkgconfig /usr/local/share/info /usr/local/share/man/man3 /usr/local/share/man/man5
brew install node
```

## 2. Create your Supabase project

1. Go to https://supabase.com → New project
2. Note your **Project URL** and two keys:
   - **anon/public key** (safe to expose in the browser)
   - **service_role key** (keep secret — only used in seed scripts)

## 3. Run the schema

In the Supabase dashboard → SQL editor → paste and run `supabase/schema.sql`.

## 4. Scaffold the Next.js app

```bash
cd ~/Desktop/Nibus
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
npm install @supabase/supabase-js @supabase/ssr csv-parse tsx
```

## 5. Add environment variables

Create `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 6. Seed your catalog

Fill in `data/catalog-sample.json` (rename to `catalog.json`) with your Tier 1 books, then:
```bash
npx tsx scripts/seed-books.ts --file ./data/catalog.json
```

The script fetches covers from Open Library and Google Books automatically.

## 7. Run the dev server

```bash
npm run dev
```
