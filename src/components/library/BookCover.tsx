import Image from "next/image";
import type { Book, BookFormat } from "@/lib/database.types";

const FORMAT_LABEL: Record<BookFormat, string> = {
  omnibus: "OMNIBUS",
  compendium: "COMPENDIUM",
  dc_absolute: "ABSOLUTE",
};

// Publisher → accent color for the generated fallback cover.
function publisherColor(publisher: string): string {
  const p = publisher.toLowerCase();
  if (p.includes("marvel")) return "#e23636";
  if (p.includes("dc")) return "#0476f2";
  if (p.includes("image")) return "#1a1a1a";
  if (p.includes("dark horse")) return "#2b2b2b";
  return "#3f3f46";
}

/**
 * Renders the real cover when available, else a generated fallback
 * (publisher color + format stamp). The full pipeline lands in Step 3;
 * this is the permanent fallback look in miniature.
 */
export function BookCover({ book, width = 64 }: { book: Book; width?: number }) {
  const height = Math.round(width * 1.5);

  if (book.cover_url) {
    return (
      <Image
        src={book.cover_url}
        alt={book.title}
        width={width}
        height={height}
        className="rounded object-cover shadow-sm"
        style={{ width, height }}
      />
    );
  }

  return (
    <div
      className="flex flex-col justify-between rounded p-1.5 text-white shadow-sm"
      style={{ width, height, backgroundColor: publisherColor(book.publisher) }}
    >
      <span className="text-[7px] font-bold uppercase tracking-wider opacity-80">
        {FORMAT_LABEL[book.format]}
      </span>
      <span className="line-clamp-4 text-[8px] font-semibold leading-tight">
        {book.title}
        {book.volume ? ` v${book.volume}` : ""}
      </span>
    </div>
  );
}

export { FORMAT_LABEL };
