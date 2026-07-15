interface Props {
  value: number; // 0..3
  size?: number;
  animate?: boolean;
}

export function Stars({ value, size = 24, animate }: Props) {
  return (
    <span className="stars" aria-label={`${value} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className={`star ${i < value ? 'star--on' : 'star--off'} ${animate && i < value ? 'star--pop' : ''}`}
          style={{ animationDelay: animate ? `${i * 0.18}s` : undefined }}
        >
          <path
            d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21l1.4-6.8L2.2 9.6l6.9-.7z"
            fill={i < value ? '#ffc83d' : 'rgba(255,255,255,0.16)'}
            stroke={i < value ? '#e0a01f' : 'rgba(255,255,255,0.25)'}
            strokeWidth="1"
          />
        </svg>
      ))}
    </span>
  );
}
