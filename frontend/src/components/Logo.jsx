export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Kids Trendy Ware"
    >
      <defs>
        <linearGradient id="ktwLogoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6f91" />
          <stop offset="1" stopColor="#a259c6" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="url(#ktwLogoGrad)" stroke="#fff" strokeWidth="2" />

      {/* puff sleeves */}
      <circle cx="19.5" cy="27" r="4.3" fill="#fff" />
      <circle cx="44.5" cy="27" r="4.3" fill="#fff" />

      {/* bodice */}
      <path d="M27 19 H37 L39 33 H25 Z" fill="#fff" />
      {/* skirt */}
      <path d="M25 33 H39 L47 50 H17 Z" fill="#fff" />

      {/* waist belt */}
      <line x1="25" y1="33" x2="39" y2="33" stroke="#a259c6" strokeWidth="1.5" />

      {/* bow at neckline */}
      <path d="M32 18.6 L25.5 15.4 L25.5 21.8 Z" fill="#ffd166" />
      <path d="M32 18.6 L38.5 15.4 L38.5 21.8 Z" fill="#ffd166" />
      <circle cx="32" cy="18.6" r="1.8" fill="#ffd166" />

      {/* sparkle accent */}
      <path
        d="M49 13 L50.4 16.6 54 18 L50.4 19.4 49 23 L47.6 19.4 44 18 L47.6 16.6 Z"
        fill="#ffd166"
      />
    </svg>
  )
}
