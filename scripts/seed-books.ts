/**
 * Seed script: imports Tier 1 catalog from a JSON or CSV file into the books table.
 *
 * Usage:
 *   npx tsx scripts/seed-books.ts --file ./data/catalog.json
 *   npx tsx scripts/seed-books.ts --file ./data/catalog.csv
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role key, bypasses RLS
 *
 * JSON format (array of objects):
 * [
 *   {
 *     "title": "Amazing Spider-Man Omnibus",
 *     "volume": 1,
 *     "publisher": "Marvel",
 *     "format": "omnibus",       // "omnibus" | "compendium" | "dc_absolute"
 *     "year": 2007,
 *     "pages": 1104,
 *     "isbn": "9780785122906",
 *     "collects": "Amazing Fantasy #15, Amazing Spider-Man #1-38, Annual #1-2"
 *   },
 *   ...
 * ]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import path from "path";

// Load .env.local so the service-role key is available when run via `npm run seed`.
// process.loadEnvFile is built into Node 20.12+ / 22+ — no dotenv dependency needed.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist yet; env vars can also be passed inline.
}

const args = process.argv.slice(2);
const fileArgIdx = args.indexOf("--file");
if (fileArgIdx === -1 || !args[fileArgIdx + 1]) {
  console.error("Usage: npx tsx scripts/seed-books.ts --file <path>");
  process.exit(1);
}
const filePath = path.resolve(args[fileArgIdx + 1]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function fetchCoverUrl(isbn: string | undefined): Promise<string | null> {
  if (!isbn) return null;
  const openLibUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const res = await fetch(openLibUrl, { method: "HEAD" });
    if (res.ok) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  } catch {}

  const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
  try {
    const res = await fetch(googleUrl);
    const data = await res.json();
    const img = data?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    if (img) return img.replace("http://", "https://").replace("zoom=1", "zoom=3");
  } catch {}

  return null;
}

interface BookRow {
  title: string;
  volume?: number;
  publisher: string;
  format: "omnibus" | "compendium" | "dc_absolute";
  year?: number;
  pages?: number;
  isbn?: string;
  collects?: string;
  authors?: string;
  artists?: string;
}

function loadFile(fp: string): BookRow[] {
  const ext = path.extname(fp).toLowerCase();
  const raw = readFileSync(fp, "utf-8");

  if (ext === ".json") return JSON.parse(raw) as BookRow[];
  if (ext === ".csv") {
    return parse(raw, { columns: true, skip_empty_lines: true }) as BookRow[];
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

async function main() {
  const books = loadFile(filePath);
  console.log(`Loaded ${books.length} books from ${filePath}`);

  let inserted = 0;
  let skipped = 0;

  for (const book of books) {
    const cover_url = await fetchCoverUrl(book.isbn);

    const { error } = await supabase.from("books").upsert(
      {
        title: book.title,
        volume: book.volume ?? null,
        publisher: book.publisher,
        format: book.format,
        year: book.year ?? null,
        pages: book.pages ?? null,
        isbn: book.isbn ?? null,
        collects: book.collects ?? null,
        authors: book.authors ?? null,
        artists: book.artists ?? null,
        cover_url,
      },
      { onConflict: "title,volume,publisher" }
    );

    if (error) {
      console.error(`  ✗ ${book.title}:`, error.message);
      skipped++;
    } else {
      console.log(`  ✓ ${book.title}${book.volume ? ` Vol. ${book.volume}` : ""}${cover_url ? " [cover]" : ""}`);
      inserted++;
    }
  }

  console.log(`\nDone. ${inserted} upserted, ${skipped} errors.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
