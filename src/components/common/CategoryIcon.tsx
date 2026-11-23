import IconCircle from "@/components/common/IconCircle";
import { getCategoryEmoji, getCategoryIcon } from "@/lib/categoryIcons";

interface CategoryIconProps {
  name: string | null;
  iconKey?: string | null;
  color: string;
  size?: number;
}

/**
 * A category's icon: its emoji on its own, with no tile behind it, in a box
 * the same size as the tile so rows line up. Categories with no matching
 * emoji keep the tinted line-icon tile.
 */
export default function CategoryIcon({ name, iconKey, color, size = 40 }: CategoryIconProps) {
  const emoji = getCategoryEmoji(name, iconKey);
  if (!emoji) {
    return <IconCircle icon={getCategoryIcon(name, iconKey)} color={color} size={size} />;
  }
  const img = Math.round(size * 0.72);
  return (
    <div
      className="shrink-0"
      style={{ width: size, height: size, display: "grid", placeItems: "center" }}
    >
      <img
        src={emoji.src}
        alt=""
        width={img}
        height={img}
        draggable={false}
        className={emoji.dark ? "cat-emoji-dark" : undefined}
        style={{ display: "block" }}
      />
    </div>
  );
}
