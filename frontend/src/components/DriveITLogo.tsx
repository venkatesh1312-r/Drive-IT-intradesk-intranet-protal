'use client';
import { useId } from 'react';

export function DriveITLogo({ size = 1 }: { size?: number }) {
  const height = Math.round(48 * size);

  return (
    <img
      src="/drive-it-logo.svg"
      alt="DriveIT Technologies"
      style={{
        height,
        width: 'auto',
        display: 'block',
        objectFit: 'contain',
      }}
    />
  );
}

export function DriveITMark({ size = 1 }: { size?: number }) {
  const uid = useId().replace(/:/g, '_');
  const h = Math.round(40 * size);
  const d = `M 10 2 Q 2 2 2 10 L 2 90 Q 2 98 10 98 L 35 98 Q 63 98 63 50 Q 63 2 35 2 Z`;

  return (
    <svg
      width={Math.round(h * 0.63)}
      height={h}
      viewBox="0 0 65 100"
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={uid}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill="rgba(255,255,255,0.22)" />
      <g clipPath={`url(#${uid})`}>
        {[5.5, 12, 19, 26, 33].map((r, i) => (
          <circle key={i} cx="34" cy="50" r={r} stroke="white" strokeWidth="2.2" fill="none" />
        ))}
      </g>
    </svg>
  );
}
