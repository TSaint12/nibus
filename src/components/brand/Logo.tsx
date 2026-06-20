import { BurstLogo } from "./BurstLogo";

/** Logo lockups: the mark plus the Bricolage wordmark. */
export function Logo({
  layout = "horizontal",      // "horizontal" | "stacked" | "mark"
  size = 40,
  variant = "dark",
}: {
  layout?: "horizontal" | "stacked" | "mark";
  size?: number;
  variant?: "dark" | "light";
}) {
  if (layout === "mark") return <BurstLogo size={size} variant={variant} />;
  const wordColor = variant === "light" ? "text-ink" : "text-pulp";
  const stacked = layout === "stacked";
  return (
    <div className={`flex items-center gap-3 ${stacked ? "flex-col text-center" : ""}`}>
      <BurstLogo size={stacked ? size * 1.6 : size} variant={variant} />
      <span
        className={`font-[family-name:var(--font-display)] font-bold tracking-[-0.04em] ${wordColor}`}
        style={{ fontSize: stacked ? size * 1.05 : size * 1.15, lineHeight: 1 }}
      >
        Nibus
      </span>
    </div>
  );
}
