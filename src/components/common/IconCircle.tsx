interface IconCircleProps {
  icon: React.ReactNode;
  color: string;
  size?: number;
}

export default function IconCircle({ icon, color, size = 40 }: IconCircleProps) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}20`,
        color,
        fontSize: size * 0.45,
      }}
    >
      {icon}
    </div>
  );
}
