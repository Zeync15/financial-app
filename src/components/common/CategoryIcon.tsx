import IconCircle from "@/components/common/IconCircle";
import { getCategoryEmoji, getCategoryIcon, isVeryDark } from "@/lib/categoryIcons";
import { emojiIsDark, emojiSrc } from "@/lib/emojiCatalog";

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
  return <EmojiBox src={emoji.src} dark={emoji.dark} size={size} />;
}

/** A fixed emoji from the Fluent set by key ("bank", "credit_card"), boxed like CategoryIcon. */
export function EmojiIcon({ emoji, size = 40 }: { emoji: string; size?: number }) {
  return <EmojiBox src={emojiSrc(emoji)} dark={emojiIsDark(emoji)} size={size} />;
}

/** EmojiIcon with a dot in the item's own colour at its corner (a loan's chart colour). */
export function EmojiIconDot({ emoji, color, size = 40 }: { emoji: string; color: string; size?: number }) {
  return (
    <span className="emoji-dot-wrap" style={{ width: size, height: size }}>
      <EmojiIcon emoji={emoji} size={size} />
      <span
        className="emoji-dot"
        style={{
          background: color,
          // Near-black colours vanish on the dark panel: add a light rim.
          boxShadow: isVeryDark(color)
            ? "0 0 0 2px var(--panel), inset 0 0 0 1px rgba(255,255,255,0.35)"
            : undefined,
        }}
      />
    </span>
  );
}

function EmojiBox({ src, dark, size }: { src: string; dark: boolean; size: number }) {
  const img = Math.round(size * 0.72);
  return (
    <div
      className="shrink-0"
      style={{ width: size, height: size, display: "grid", placeItems: "center" }}
    >
      <img
        src={src}
        alt=""
        width={img}
        height={img}
        draggable={false}
        className={dark ? "cat-emoji-dark" : undefined}
        style={{ display: "block" }}
      />
    </div>
  );
}
