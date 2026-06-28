interface IconCircleProps {
  icon: React.ReactNode;
  color: string;
  size?: number;
}

export default function IconCircle({ icon, color, size = 40 }: IconCircleProps) {
  return (
    <div
      className="shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        display: "grid",
        placeItems: "center",
        background: `color-mix(in oklab, ${color} 24%, transparent)`,
        color,
        fontSize: size * 0.5,
      }}
    >
      {icon}
    </div>
  );
}
