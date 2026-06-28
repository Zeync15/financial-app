import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Divider } from "antd";
import {
  MailOutlined,
  LockOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { signIn } from "@/lib/auth-client";
import AuthShell from "@/components/auth/AuthShell";

const { Title, Text } = Typography;
const accent = "#1ec98a";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      navigate("/");
    } catch (e: any) {
      message.error(e?.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card
        className="auth-card"
        styles={{ body: { padding: "40px 36px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
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
            <WalletOutlined style={{ fontSize: 26, color: "#fff" }} />
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
            Sign in to your account
          </Text>
        </div>
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
              size="large"
              autoComplete="email"
              style={{ height: 44 }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Enter your password" }]}
            style={{ marginBottom: 8 }}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              style={{ height: 44 }}
            />
          </Form.Item>
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <Link to="/login" style={{ color: accent, fontSize: 13 }}>
              Forgot password?
            </Link>
          </div>
          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ height: 46, fontWeight: 600 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
        <Divider plain>
          <Text type="secondary">or</Text>
        </Divider>
        <div style={{ textAlign: "center" }}>
          <Text>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: accent }}>
              Create one
            </Link>
          </Text>
        </div>
      </Card>
    </AuthShell>
  );
}
