/**
 * Every Supabase request must reach the database. Next.js 14 otherwise keeps fetch() responses
 * (POSTs included) made from route handlers in its Data Cache and replays them, which served
 * stale answers (an old logo, an old health check). Settings are cached on purpose, separately.
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
