/** Florzinha decorativa no estilo da arte do evento */
export function Flower({
  size = 60,
  color = "#F6B3D0",
  center = "#FFF2B3",
  className,
  style,
}: {
  size?: number;
  color?: string;
  center?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="32" cy="15" r="12" fill={color} />
      <circle cx="48.2" cy="26.8" r="12" fill={color} />
      <circle cx="42" cy="45.8" r="12" fill={color} />
      <circle cx="22" cy="45.8" r="12" fill={color} />
      <circle cx="15.8" cy="26.8" r="12" fill={color} />
      <circle cx="32" cy="32" r="10" fill={center} />
    </svg>
  );
}
