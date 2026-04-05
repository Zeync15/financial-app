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
