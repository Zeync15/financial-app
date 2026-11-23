// Emoji for category icons: Microsoft's Fluent Emoji Flat set (MIT, see
// public/emoji/LICENSE), every emoji in public/emoji/fluent/<key>.svg. A
// category picks one in the Categories form and stores it in its `icon`
// column as "emoji:<key>". Older categories store a word ("food") that
// categoryIcons.tsx matches to one of the files in public/emoji instead.

export const EMOJI_PREFIX = "emoji:";

// Suggested in the picker, by group: emoji that suit a family budget in
// Malaysia. Search covers the whole set.
export const EMOJI_GROUPS: { title: string; keys: string[] }[] = [
  { title: "Food & drink", keys: ["fork_and_knife", "steaming_bowl", "cooked_rice", "hamburger", "pizza", "sushi", "hot_beverage", "bubble_tea", "shortcake", "shallow_pan_of_food", "shopping_cart", "leafy_green", "red_apple"] },
  { title: "Transport", keys: ["automobile", "fuel_pump", "p_button", "train", "bus", "taxi", "motor_scooter", "airplane", "motorway", "wrench"] },
  { title: "Home & bills", keys: ["house", "key", "light_bulb", "droplet", "antenna_bars", "mobile_phone", "receipt", "broom", "couch_and_lamp", "hammer"] },
  { title: "Family", keys: ["baby", "child", "older_person", "ring", "graduation_cap", "school", "baby_bottle", "teddy_bear"] },
  { title: "Pets", keys: ["black_cat", "dog", "fish", "bird", "bone"] },
  { title: "Health & care", keys: ["pill", "hospital", "tooth", "glasses", "flexed_biceps", "lotion_bottle", "scissors", "nail_polish"] },
  { title: "Shopping", keys: ["shopping_bags", "t_shirt", "running_shoe", "handbag", "laptop", "video_game", "package"] },
  { title: "Leisure & hobbies", keys: ["clapper_board", "musical_note", "tennis", "badminton", "soccer_ball", "guitar", "books", "artist_palette", "camping", "admission_tickets"] },
  { title: "Travel", keys: ["airplane_departure", "hotel", "luggage", "world_map", "beach_with_umbrella", "passport_control"] },
  { title: "Giving & occasions", keys: ["wrapped_gift", "red_envelope", "birthday_cake", "party_popper", "folded_hands", "mosque", "church", "hindu_temple"] },
  { title: "Money & work", keys: ["money_bag", "dollar_banknote", "purse", "coin", "briefcase", "clipboard", "bank", "chart_increasing", "repeat_button"] },
  { title: "Finance & admin", keys: ["credit_card", "chart_decreasing", "shield", "bookmark_tabs", "classical_building"] },
  { title: "Other", keys: ["label", "red_question_mark", "pushpin"] },
];

// The app's own recoloured car (#383838) and black cat stand in for the set's.
// Both are very dark, so they get a thin light outline on the dark panels.
const CUSTOM: Record<string, string> = {
  automobile: "/emoji/car.svg",
  black_cat: "/emoji/cat.svg",
};

export function emojiSrc(key: string): string {
  return CUSTOM[key] ?? `/emoji/fluent/${key}.svg`;
}

export function emojiIsDark(key: string): boolean {
  return key in CUSTOM;
}

/** "fork_and_knife" → "Fork and knife" (the index has the proper names). */
export function emojiLabel(key: string): string {
  const t = key.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** The emoji key a category's `icon` names, or null for an older word icon. */
export function emojiKeyOf(icon: string | null | undefined): string | null {
  return icon && icon.startsWith(EMOJI_PREFIX) ? icon.slice(EMOJI_PREFIX.length) : null;
}

// [key, name, keywords, group] for every emoji in the set. Loaded only when
// someone searches, so it stays out of the main bundle.
export type EmojiEntry = [string, string, string, string];
let indexPromise: Promise<EmojiEntry[]> | null = null;
export function loadEmojiIndex(): Promise<EmojiEntry[]> {
  indexPromise ??= import("./emoji-index.json").then((m) => m.default as EmojiEntry[]);
  return indexPromise;
}

const SUGGESTED = new Set(EMOJI_GROUPS.flatMap((g) => g.keys));

// Words people here search for that Fluent's own keywords lack.
const EXTRA_KEYWORDS: Record<string, string> = {
  // The everyday category names, so typing one finds its emoji.
  fork_and_knife: "food drinks makan restaurant dining eat",
  shopping_cart: "groceries grocery supermarket",
  leafy_green: "groceries vegetables sayur",
  shopping_bags: "shopping clothes",
  package: "online shopping parcel shopee lazada",
  clapper_board: "entertainment movies cinema wayang",
  tennis: "sports hobbies",
  badminton: "sports hobbies",
  soccer_ball: "sports futsal",
  pill: "health healthcare medicine ubat",
  hospital: "health healthcare clinic klinik doctor",
  scissors: "beauty haircut salon",
  nail_polish: "beauty",
  wrapped_gift: "gifts present hadiah",
  airplane: "travel flight",
  books: "education study",
  graduation_cap: "education school fees",
  money_bag: "salary gaji income",
  party_popper: "bonus celebration",
  purse: "allowance elaun",
  bank: "savings simpanan",
  dollar_banknote: "income cash extra",
  briefcase: "work salary",
  laptop: "freelance work",
  video_game: "games gaming",
  label: "other misc",
  fuel_pump: "petrol minyak",
  motorway: "toll tol highway",
  p_button: "parking",
  train: "lrt mrt ktm commute transport",
  bus: "transport",
  taxi: "grab transport e-hailing",
  automobile: "car kereta",
  motor_scooter: "motorbike motorcycle",
  red_envelope: "ang pao angpao duit raya hongbao",
  folded_hands: "zakat donation charity tithe sedekah",
  mosque: "zakat masjid",
  light_bulb: "electricity tnb electric",
  droplet: "water bill",
  antenna_bars: "internet wifi broadband",
  mobile_phone: "phone bill postpaid prepaid",
  receipt: "bill bills fees",
  house: "rent home mortgage",
  key: "rent",
  cooked_rice: "nasi",
  shallow_pan_of_food: "nasi lemak",
  steaming_bowl: "noodles mee laksa",
  bubble_tea: "boba",
  hot_beverage: "kopi teh",
  baby: "kids",
  child: "kids",
  older_person: "parents",
  shield: "insurance takaful",
  bookmark_tabs: "tax lhdn",
  classical_building: "government",
  repeat_button: "refund subscription",
  chart_increasing: "dividend investment",
  chart_decreasing: "loan debt",
  coin: "cashback",
  clipboard: "claims",
  black_cat: "pet",
  dog: "pet",
  fish: "pet",
  bird: "pet",
  bone: "pet food",
};

/** Keys whose words start with every word of the query, best first. */
export function searchEmoji(index: EmojiEntry[], query: string, limit = 120): string[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits: { key: string; score: number }[] = [];
  for (const [key, name, keywords] of index) {
    const n = name.toLowerCase();
    // Match the start of a word, so "pet" finds pets but not "trumpet".
    const tokens = `${n} ${keywords} ${EXTRA_KEYWORDS[key] ?? ""}`.split(/[\s,()-]+/);
    if (!words.every((w) => tokens.some((t) => t.startsWith(w)))) continue;
    const first = words[0]!;
    const score =
      (SUGGESTED.has(key) ? 0 : 8) +
      (n === query.toLowerCase().trim() ? 0 : 4) +
      (n.startsWith(first) ? 0 : 2) +
      (` ${n} `.includes(` ${first} `) ? 0 : 1);
    hits.push({ key, score });
  }
  hits.sort((a, b) => a.score - b.score);
  return hits.slice(0, limit).map((h) => h.key);
}

// Category colours: the app gives each new category the next colour from this
// set (Ant Design's chart colours, which stay apart on the dark panels), once,
// when the category is made. They show as the slices of the Insights chart.
export const CATEGORY_PALETTE = [
  "#5b8ff9", "#61ddaa", "#f6bd16", "#7262fd", "#78d3f8", "#f6903d",
  "#f08bb4", "#e8684a", "#a0d911", "#9661bc", "#008685", "#bfbfbf",
];

export function nextCategoryColor(used: (string | null | undefined)[]): string {
  const taken = new Set(used.filter(Boolean).map((c) => c!.toLowerCase()));
  return (
    CATEGORY_PALETTE.find((c) => !taken.has(c)) ??
    CATEGORY_PALETTE[used.length % CATEGORY_PALETTE.length]!
  );
}
