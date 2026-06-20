type Props = {
  size?: number;                 // px, default 64
  variant?: "dark" | "light";    // dark = white outline; light = navy outline
  tile?: boolean;                // render the app-icon tile behind it
  className?: string;
};

const BURST =
  "60,10 69,29.3 87,17.9 84.2,39 105.5,39.2 91.7,55.4 109.5,67.1 89.1,73.3 " +
  "97.8,92.7 77.3,86.9 74.1,108 60,92 45.9,108 42.7,86.9 22.2,92.7 30.9,73.3 " +
  "10.5,67.1 28.3,55.4 14.5,39.2 35.8,39 33,17.9 51,29.3";

/** The Nibus mark: a foil burst with an "N" whose diagonal is a book
 *  (gold spine + cream page-edge). Single keyline — white on dark, navy on light. */
export function BurstLogo({ size = 64, variant = "dark", tile = false, className }: Props) {
  const outline = variant === "light" ? "#14203A" : "#F2E7D3";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Nibus"
      className={className}
    >
      {tile && <rect width="120" height="120" rx="28" fill="#12182A" />}
      <polygon points={BURST} fill="#D4A84B" stroke={outline} strokeWidth="3" strokeLinejoin="round" />
      {/* N — two uprights + a book as the diagonal */}
      <rect x="40" y="38" width="9" height="44" rx="1.5" fill="#14203A" />
      <rect x="71" y="38" width="9" height="44" rx="1.5" fill="#14203A" />
      <polygon points="50.6,35.8 80.6,75.8 69.4,84.2 39.4,44.2" fill="#14203A" />
      <polygon points="50.6,35.8 80.6,75.8 78.5,77.4 48.5,37.4" fill="#E6BC63" />
      <polygon points="39.4,44.2 69.4,84.2 71.5,82.6 41.5,42.6" fill="#F2E7D3" />
    </svg>
  );
}
