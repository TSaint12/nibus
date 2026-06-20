/** Kirby krackle / halftone dots — reusable comic texture for empty states,
 *  dividers, and loading backdrops. Keep it sparse: seasoning, not wallpaper. */
export function KrackleField({ className }: { className?: string }) {
  const dots = [
    [16, 18, 3], [23, 11, 2], [11, 27, 2.2], [27, 21, 1.6], [19, 31, 2.6],
    [104, 15, 2.6], [111, 24, 2], [99, 9, 1.6], [108, 33, 2.2],
  ] as const;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i === 3 ? "#D4A84B" : "#0B1428"} />
      ))}
    </svg>
  );
}
