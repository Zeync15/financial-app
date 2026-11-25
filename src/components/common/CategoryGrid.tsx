import CategoryIcon from "@/components/common/CategoryIcon";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryIcons";

export interface GridCategory {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

/**
 * Category picker: every category as a round emoji with its name under it,
 * one tap to choose. `capped` keeps it to about two and a half rows (the
 * cut-off row shows there is more) for forms that don't fit the screen.
 */
export default function CategoryGrid({
  categories,
  value,
  onChange,
  capped,
  allowNone,
  label = "Category",
}: {
  /** Accessible name of the group. */
  label?: string;
  categories: GridCategory[];
  value: string;
  onChange: (id: string) => void;
  capped?: boolean;
  /** Tapping the chosen category again clears it. */
  allowNone?: boolean;
}) {
  return (
    <div
      className={capped ? "qcat-grid qcat-capped fm-scroll" : "qcat-grid fm-scroll"}
      role="radiogroup"
      aria-label={label}
    >
      {categories.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={on ? "qcat on" : "qcat"}
            onClick={() => onChange(on && allowNone ? "" : c.id)}
          >
            <span className="qcat-ic">
              <CategoryIcon
                name={c.name}
                iconKey={c.icon}
                color={c.color ?? DEFAULT_CATEGORY_COLOR}
                size={36}
              />
            </span>
            <span className="qcat-name">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
