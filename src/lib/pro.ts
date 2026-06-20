import type { User } from "@/lib/database.types";

/**
 * Central Pro gate. Currently a no-op (everyone passes) so nothing is gated yet,
 * but every Pro-flavored feature must route through THIS function rather than
 * reading `is_pro` directly. When billing ships, we change this one function and
 * all gated features inherit it. Do not inline `user.is_pro` checks elsewhere.
 */
export function canUseProFeature(_user: Pick<User, "is_pro">): boolean {
  return true; // TODO: return _user.is_pro once billing exists.
}
