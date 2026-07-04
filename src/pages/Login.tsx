import { Card, Typography } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import AuthShell from "@/components/auth/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";

const { Title, Text } = Typography;
const accent = "#1ec98a";

export default function Login() {
  return (
    <AuthShell>
      <Card className="auth-card" styles={{ body: { padding: "40px 36px" } }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: accent,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 6px 16px ${accent}55`,
              marginBottom: 16,
            }}
          >
            <DollarOutlined style={{ fontSize: 26, color: "#fff" }} />
          </div>
          <Title
            level={3}
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Welcome back
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Sign in to continue
          </Text>
        </div>
        <GoogleButton />
      </Card>
    </AuthShell>
  );
}
