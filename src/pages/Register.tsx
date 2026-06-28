import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Divider } from "antd";
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { signUp } from "@/lib/auth-client";
import { supabase } from "@/lib/supabase";
import AuthShell from "@/components/auth/AuthShell";

const { Title, Text } = Typography;
const accent = "#1ec98a";

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: {
    name?: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      await signUp(values.email, values.password, values.name);
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        message.success("Account created!");
        navigate("/");
      } else {
        message.success("Account created — check your email to confirm, then sign in.");
        navigate("/login");
      }
    } catch (e: any) {
      message.error(e?.message ?? "Registration failed");
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
            Create account
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Get started with your financial journey
          </Text>
        </div>
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item name="name">
            <Input
              prefix={<UserOutlined />}
              placeholder="Display name (optional)"
              size="large"
              autoComplete="name"
              style={{ height: 44 }}
            />
          </Form.Item>
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
            rules={[
              { required: true, min: 5, message: "At least 5 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              style={{ height: 44 }}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirm your password" },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject("Passwords do not match"),
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
              size="large"
              style={{ height: 44 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ height: 46, fontWeight: 600 }}
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>
        <Divider plain>
          <Text type="secondary">or</Text>
        </Divider>
        <div style={{ textAlign: "center" }}>
          <Text>
            Already have an account?{" "}
            <Link to="/login" style={{ color: accent }}>
              Sign in
            </Link>
          </Text>
        </div>
      </Card>
    </AuthShell>
  );
}
