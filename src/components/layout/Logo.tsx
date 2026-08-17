export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M16 11 L84 11 L84 54 Q84 80 50 95 Q16 80 16 54 Z" fill="#e6e6e4" />
      <path d="M40 11 L60 11 L50 24 Z" fill="#ff3b30" />
      <text x="50" y="68" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="50" fill="#0a0a0b">
        U
      </text>
    </svg>
  );
}
