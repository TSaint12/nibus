// Library data layer (private per-user state: TBR/Read/rating/review).
//
// Populated in Phase 1 (migrated from src/app/library/actions.ts): rateBook,
// saveReview, setTbr, setRead. All emit NO feed events. Client-callable via the
// browser Supabase client (RLS scopes writes to the owner).

export {};
