import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Persists the active sidebar tab purely via the URL's ?tab= query param —
// deliberately no localStorage/sessionStorage. A refresh re-reads the tab
// straight from the address bar, and the router keeps the address bar in
// sync as the person switches tabs.
export function useActiveTab<T extends string>(basePath: string, validKeys: readonly T[], fallback: T) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlTab = searchParams.get('tab') as T | null;
  const initial = urlTab && (validKeys as readonly string[]).includes(urlTab) ? urlTab : fallback;
  const [active, setActiveState] = useState<T>(initial);

  const setActive = useCallback((next: T) => {
    setActiveState(next);
    router.replace(`${basePath}?tab=${next}`, { scroll: false });
  }, [router, basePath]);

  return [active, setActive] as const;
}
