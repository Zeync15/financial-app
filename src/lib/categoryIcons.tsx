import {
  CoffeeOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  CarOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  BookOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  HomeOutlined,
  DollarOutlined,
  GlobalOutlined,
  CreditCardOutlined,
  GiftOutlined,
  SafetyOutlined,
  SwapOutlined,
  TagOutlined,
  ScissorOutlined,
  PhoneOutlined,
  DesktopOutlined,
  TeamOutlined,
  TrophyOutlined,
  SmileOutlined,
} from "@ant-design/icons";

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  food: <CoffeeOutlined />,
  drink: <CoffeeOutlined />,
  restaurant: <CoffeeOutlined />,
  groceries: <ShoppingCartOutlined />,
  grocery: <ShoppingCartOutlined />,
  shopping: <ShoppingOutlined />,
  transport: <CarOutlined />,
  transportation: <CarOutlined />,
  fuel: <CarOutlined />,
  gas: <CarOutlined />,
  parking: <CarOutlined />,
  health: <HeartOutlined />,
  medical: <MedicineBoxOutlined />,
  pharmacy: <MedicineBoxOutlined />,
  education: <BookOutlined />,
  utilities: <ThunderboltOutlined />,
  electric: <ThunderboltOutlined />,
  water: <ThunderboltOutlined />,
  internet: <DesktopOutlined />,
  bills: <FileTextOutlined />,
  fees: <FileTextOutlined />,
  rent: <HomeOutlined />,
  housing: <HomeOutlined />,
  mortgage: <HomeOutlined />,
  salary: <DollarOutlined />,
  income: <DollarOutlined />,
  freelance: <DollarOutlined />,
  travel: <GlobalOutlined />,
  vacation: <GlobalOutlined />,
  subscription: <CreditCardOutlined />,
  gift: <GiftOutlined />,
  insurance: <SafetyOutlined />,
  transfer: <SwapOutlined />,
  personal: <SmileOutlined />,
  beauty: <ScissorOutlined />,
  phone: <PhoneOutlined />,
  family: <TeamOutlined />,
  sports: <TrophyOutlined />,
  fitness: <TrophyOutlined />,
  entertainment: <SmileOutlined />,
};

export const DEFAULT_CATEGORY_COLOR = "#8c8c8c";

export function getCategoryIcon(
  categoryName: string | null,
  categoryIcon?: string | null,
): React.ReactNode {
  if (categoryIcon && CATEGORY_ICON_MAP[categoryIcon.toLowerCase()]) {
    return CATEGORY_ICON_MAP[categoryIcon.toLowerCase()];
  }

  if (categoryName) {
    const lower = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
      if (lower.includes(key)) return icon;
    }
  }

  return <TagOutlined />;
}

// ─── Emoji category icons ────────────────────────────────────────────────────
// Every category shows an emoji that looks like the thing (Fluent Emoji Flat,
// MIT, files in public/emoji). Matched on whole words of the category's icon
// key first, then its name, in this order, so "Cash Back" wins over "Cash"
// and "Cat" never matches inside "Education". No match falls back to the
// line icon above.
const EMOJI_RULES: { file: string; words: string[]; dark?: boolean }[] = [
  { file: "cashback", words: ["cash back", "cashback", "rebate"] },
  { file: "income", words: ["extra income", "income"] },
  { file: "car", words: ["car", "fuel", "petrol", "parking", "toll"], dark: true },
  { file: "cat", words: ["cat", "pet", "pets"], dark: true },
  { file: "food", words: ["food", "drink", "drinks", "restaurant", "dining"] },
  { file: "groceries", words: ["groceries", "grocery"] },
  { file: "shopping", words: ["shopping"] },
  { file: "bills", words: ["bills", "bill", "fees", "fee"] },
  { file: "utilities", words: ["utilities", "electric", "electricity", "water"] },
  { file: "transport", words: ["transport", "transportation", "train", "bus"] },
  { file: "entertainment", words: ["entertainment", "movies", "movie"] },
  { file: "sports", words: ["sports", "sport", "hobbies", "hobby", "fitness", "gym"] },
  { file: "health", words: ["healthcare", "health", "medical", "pharmacy"] },
  { file: "beauty", words: ["beauty", "haircut", "salon"] },
  { file: "gift", words: ["gifts", "gift"] },
  { file: "travel", words: ["travel", "vacation", "holiday"] },
  { file: "home", words: ["home", "rent", "housing", "mortgage"] },
  { file: "education", words: ["education", "school", "books"] },
  { file: "subscription", words: ["subscription", "subscriptions"] },
  { file: "salary", words: ["salary", "wages"] },
  { file: "bonus", words: ["bonus"] },
  { file: "allowance", words: ["allowance"] },
  { file: "claims", words: ["claims", "claim", "reimbursement"] },
  { file: "freelance", words: ["freelance"] },
  { file: "savings", words: ["savings", "saving"] },
  { file: "other", words: ["other", "others", "misc"] },
];

export interface CategoryEmoji {
  src: string;
  /** The emoji itself is very dark (the #383838 car, the black cat): give it a light outline. */
  dark: boolean;
}

function matchEmoji(text: string): CategoryEmoji | null {
  const norm = ` ${text.toLowerCase().replace(/[^a-z]+/g, " ").trim()} `;
  for (const r of EMOJI_RULES) {
    if (r.words.some((w) => norm.includes(` ${w} `))) {
      return { src: `/emoji/${r.file}.svg`, dark: !!r.dark };
    }
  }
  return null;
}

export function getCategoryEmoji(
  categoryName: string | null,
  categoryIcon?: string | null,
): CategoryEmoji | null {
  return (categoryIcon && matchEmoji(categoryIcon)) || (categoryName && matchEmoji(categoryName)) || null;
}
