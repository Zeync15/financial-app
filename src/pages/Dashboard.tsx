import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import {
  DollarOutlined,
  BankOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";

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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <Spin size="large" className="flex justify-center mt-20" />;

  return (
    <div>
      <Title level={3} className="mb-6!">
        Dashboard
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Net Worth"
              value={data?.netWorth ?? 0}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="MYR"
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Total Assets"
              value={data?.totalAssets ?? 0}
              precision={2}
              prefix={<BankOutlined />}
              suffix="MYR"
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Monthly Income"
              value={data?.monthlyIncome ?? 0}
              precision={2}
              prefix={<RiseOutlined />}
              suffix="MYR"
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Monthly Expenses"
              value={data?.monthlyExpense ?? 0}
              precision={2}
              prefix={<FallOutlined />}
              suffix="MYR"
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} md={12}>
          <Card title="Quick Stats">
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
