import { emojiSrc } from "@/lib/emojiCatalog";

/** An empty list: a large emoji (a Fluent key, e.g. "bullseye") over a line of text. */
export default function EmptyState({
  emoji,
  children,
}: {
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-emoji">
      <img src={emojiSrc(emoji)} alt="" width={56} height={56} draggable={false} />
      <div className="empty-emoji-text">{children}</div>
    </div>
  );
}
