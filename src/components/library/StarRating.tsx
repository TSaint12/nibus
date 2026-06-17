"use client";

import { useId, useState } from "react";

/**
 * Interactive half-star rating, 0.5–5.0. Click a half to set; click the same
 * value again to clear. Hovering previews. Read-only mode just renders stars.
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div
      className="inline-flex"
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fullValue = star;
        const halfValue = star - 0.5;
        return (
          <span
            key={star}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <StarShape filled={shown >= fullValue} half={shown >= halfValue && shown < fullValue} size={size} />
            {!readOnly && (
              <>
                {/* left half hit area */}
                <button
                  type="button"
                  aria-label={`${halfValue} stars`}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(halfValue)}
                  onClick={() => onChange?.(value === halfValue ? null : halfValue)}
                />
                {/* right half hit area */}
                <button
                  type="button"
                  aria-label={`${fullValue} stars`}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(fullValue)}
                  onClick={() => onChange?.(value === fullValue ? null : fullValue)}
                />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}

function StarShape({ filled, half, size }: { filled: boolean; half: boolean; size: number }) {
  const gold = "#f5a623";
  const empty = "currentColor";
  // Stable, collision-free id for the half-fill gradient (colons stripped so
  // it's safe inside a url(#id) reference).
  const id = "half" + useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="text-zinc-300 dark:text-zinc-600"
      aria-hidden="true"
    >
      {half && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={gold} />
            <stop offset="50%" stopColor={empty} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 17.27 6.18 21l1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.82 4.73L17.82 21z"
        fill={filled ? gold : half ? `url(#${id})` : empty}
      />
    </svg>
  );
}
