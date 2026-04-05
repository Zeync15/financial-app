import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import {
  DollarOutlined,
  BankOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";

const { Title } = Typography;

interface DashboardData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpense: number;
  accountCount: number;
  loanCount: number;
}

function rmPrefix(icon: React.ReactNode) {
  return <span className="inline-flex items-center gap-1">{icon} RM</span>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <Spin size="large" className="flex justify-center mt-20" />;

  const cardBodyStyle = { padding: isMobile ? 12 : 24 };
  const gutter = isMobile ? ([8, 8] as [number, number]) : ([16, 16] as [number, number]);
  const netWorth = data?.netWorth ?? 0;

  return (
    <div>
      <Title level={isMobile ? 4 : 3} className="mb-4!">
        Dashboard
      </Title>
      <Row gutter={gutter}>
        <Col xs={24} md={6}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Net Worth"
              value={netWorth}
              precision={2}
              prefix={rmPrefix(<DollarOutlined />)}
              valueStyle={netWorth < 0 ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} md={6} className={isMobile ? "mt-2" : ""}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Total Assets"
              value={data?.totalAssets ?? 0}
              precision={2}
              prefix={rmPrefix(<BankOutlined />)}
            />
          </Card>
        </Col>
        <Col xs={24} md={6} className={isMobile ? "mt-2" : ""}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Monthly Income"
              value={data?.monthlyIncome ?? 0}
              precision={2}
              prefix={rmPrefix(<RiseOutlined />)}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6} className={isMobile ? "mt-2" : ""}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Monthly Expenses"
              value={data?.monthlyExpense ?? 0}
              precision={2}
              prefix={rmPrefix(<FallOutlined />)}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} className="mt-2">
          <Card title="Quick Stats" styles={{ body: cardBodyStyle }}>
            <p>{data?.accountCount ?? 0} active accounts</p>
            <p>{data?.loanCount ?? 0} active loans</p>
            <p>
              Total liabilities: RM {(data?.totalLiabilities ?? 0).toFixed(2)}
            </p>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
