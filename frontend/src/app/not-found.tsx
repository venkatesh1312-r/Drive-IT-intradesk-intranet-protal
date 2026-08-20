'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Next.js's default behaviour keeps whatever URL the person typed (e.g.
// "/welcome") in the address bar while rendering this not-found UI — same
// as most sites. Per request, we instead bounce the address bar itself to
// a dedicated /page_not_found route so the URL reflects what's actually
// being shown.
export default function NotFound() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/page_not_found');
  }, [router]);
  return null;
}
