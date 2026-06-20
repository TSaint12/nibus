// Book data layer.
//
// Populated in Phase 1: getBook(id), getBookAggregate(id) (public ratings avg +
// count), getFollowedRatings(bookId, userId). Mutations elsewhere use the BROWSER
// Supabase client (src/lib/supabase/client.ts) so they stay client-callable; RLS
// keeps direct client access safe.

export {};
