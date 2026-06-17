// Hand-maintained DB types mirroring supabase/schema.sql.
// Regenerate with `supabase gen types typescript` once the CLI is linked, if you prefer.

export type BookFormat = "omnibus" | "compendium" | "dc_absolute";
export type ActivityEventType =
  | "started_reading"
  | "progress_update"
  | "finished";

export interface User {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  followee_id: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  volume: number | null;
  publisher: string;
  format: BookFormat;
  year: number | null;
  pages: number | null;
  isbn: string | null;
  collects: string | null;
  authors: string | null;   // comma-separated writers (free text, like `collects`)
  artists: string | null;   // comma-separated artists
  cover_url: string | null;
  created_at: string;
}

export interface LibraryEntry {
  id: string;
  user_id: string;
  book_id: string;
  tbr: boolean;
  read: boolean;
  rating: number | null;
  review: string | null;
  updated_at: string;
}

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string;
  current_page: number | null;
  finished_at: string | null;
  created_at: string;
}

export interface ActivityEventPayload {
  current_page?: number;
  total_pages?: number;
  rating?: number;
  review?: string;
}

export interface ActivityEvent {
  id: string;
  user_id: string;
  type: ActivityEventType;
  book_id: string;
  session_id: string | null;
  payload: ActivityEventPayload | null;
  created_at: string;
}

export interface Reaction {
  event_id: string;
  user_id: string;
  type: string;
  created_at: string;
}

export interface Comment {
  id: string;
  event_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

// Convenience: a library entry joined with its book (common UI shape).
export interface LibraryEntryWithBook extends LibraryEntry {
  book: Book;
}
