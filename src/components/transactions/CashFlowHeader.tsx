import { Button, theme, Typography } from "antd";
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
import { useIsMobile } from "@/hooks/useIsMobile";

const { useToken } = theme;
const { Title } = Typography;

interface CashFlowHeaderProps {
  netFlow: number;
  currency?: string;
  searchOpen: boolean;
  onSearchToggle: () => void;
}

export default function CashFlowHeader({
  netFlow,
  currency = "MYR",
  searchOpen,
  onSearchToggle,
}: CashFlowHeaderProps) {
  const { token } = useToken();
  const isMobile = useIsMobile();

  const isNegative = netFlow < 0;
  const formattedAmount = `${isNegative ? "-" : "+"}${currency} ${Math.abs(netFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <div>
          <Title level={isMobile ? 4 : 3} className="mb-0!">
            Transactions
          </Title>
          <p
            className="text-2xl font-bold m-0"
            style={{
              color: isNegative ? token.colorError : token.colorSuccess,
            }}
          >
            {formattedAmount}
          </p>
        </div>
        <Button
          type="text"
          icon={searchOpen ? <CloseOutlined /> : <SearchOutlined />}
          onClick={onSearchToggle}
          size="large"
        />
      </div>
    </div>
  );
}
