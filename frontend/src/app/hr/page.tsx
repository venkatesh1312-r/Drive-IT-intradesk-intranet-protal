// HR lands on /hr; it renders the same role-aware portal as /admin
// (the component shows the HR experience based on the logged-in user's role).
//
// Route segment config (like `dynamic`) is read per page.tsx file by
// Next.js — it does NOT carry over through a re-export of another page's
// default export. admin/page.tsx sets force-dynamic (auth-gated, nothing
// to prerender, and it sidesteps useActiveTab's useSearchParams()
// Suspense requirement) but that only applies to /admin unless this file
// also declares it.
export const dynamic = 'force-dynamic';
export { default } from '../admin/page';
