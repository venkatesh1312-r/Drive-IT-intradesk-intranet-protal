'use client';
import { useRouter } from 'next/navigation';

export default function PageNotFound() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#f8fafc', padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 64, fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1 }}>404</p>
      <p style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', margin: 0 }}>Page not found</p>
      <p style={{ fontSize: 13.5, color: '#64748b', maxWidth: 360, margin: 0 }}>The page you're looking for doesn't exist or may have been moved.</p>
      <button
        onClick={() => router.push('/')}
        style={{ marginTop: 8, height: 40, padding: '0 22px', borderRadius: 8, background: '#2563eb', border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
      >
        Go to homepage
      </button>
    </div>
  );
}
