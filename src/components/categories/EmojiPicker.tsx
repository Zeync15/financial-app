import { useEffect, useMemo, useState } from "react";
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
import {
  EMOJI_GROUPS,
  emojiIsDark,
  emojiLabel,
  emojiSrc,
  loadEmojiIndex,
  searchEmoji,
  type EmojiEntry,
} from "@/lib/emojiCatalog";

/**
 * Pick a category's emoji: the suggested ones in groups (chips filter to one
 * group), or search the whole Fluent set. The grid is the part of the form
 * that scrolls (`fm-scroll`), so the form around it stays put.
 */
export default function EmojiPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string) => void;
}) {
  const [group, setGroup] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<EmojiEntry[] | null>(null);
  const searching = query.trim().length > 0;

  // Fetch the search index the first time someone types.
  useEffect(() => {
    if (searching && !index) loadEmojiIndex().then(setIndex);
  }, [searching, index]);

  const names = useMemo(() => new Map(index?.map((e) => [e[0], e[1]]) ?? []), [index]);
  const label = (k: string) => names.get(k) ?? emojiLabel(k);

  const sections = useMemo(() => {
    if (searching) {
      return [{ title: `Matches for “${query.trim()}”`, keys: index ? searchEmoji(index, query) : [] }];
    }
    return EMOJI_GROUPS.filter((g) => group === "all" || g.title === group);
  }, [searching, query, index, group]);

  return (
    <>
      <span className="fld emo-search">
        <SearchOutlined className="emo-search-ic" />
        <input
          className="fld-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all emoji, e.g. cat, petrol, zakat"
          aria-label="Search emoji"
        />
        {searching && (
          <button type="button" className="emo-search-x" aria-label="Clear search" onClick={() => setQuery("")}>
            <CloseOutlined />
          </button>
        )}
      </span>
      {!searching && (
        <div className="emo-chips fm-noscrollbar" role="tablist" aria-label="Emoji groups">
          {[{ title: "All" }, ...EMOJI_GROUPS].map((g) => {
            const key = g.title === "All" ? "all" : g.title;
            const on = key === group;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? "emo-chip on" : "emo-chip"}
                onClick={() => setGroup(key)}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      )}
      <div className="emo-scroll fm-scroll">
        {sections.map((s) => (
          <div key={s.title}>
            <div className="emo-head">{s.title}</div>
            <div className="emo-grid" role="radiogroup" aria-label={s.title}>
              {s.keys.map((k) => {
                const on = k === value;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={label(k)}
                    title={label(k)}
                    className={on ? "emo on" : "emo"}
                    onClick={() => onChange(k)}
                  >
                    <img
                      src={emojiSrc(k)}
                      alt=""
                      width={28}
                      height={28}
                      loading="lazy"
                      draggable={false}
                      className={emojiIsDark(k) ? "cat-emoji-dark" : undefined}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {searching && index && sections[0]!.keys.length === 0 && (
          <div className="emo-note">No emoji for “{query.trim()}”. Try another word.</div>
        )}
        {searching && !index && <div className="emo-note">Loading…</div>}
        {searching && index && sections[0]!.keys.length > 0 && (
          <div className="emo-note">Search covers all {index.length.toLocaleString("en-MY")} Fluent emoji, not just the suggested ones.</div>
        )}
      </div>
    </>
  );
}
