import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Divider } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { signIn } from "@/lib/auth-client";

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        message.error(result.error.message ?? "Invalid email or password");
      } else {
        navigate("/");
      }
    } catch {
      message.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-96 max-w-[90vw] shadow-md">
        <div className="text-center mb-6">
          <Title level={3} className="mb-1!">
            Welcome Back
          </Title>
          <Text type="secondary">Sign in to your account</Text>
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
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          <Form.Item className="mb-3!">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
        <Divider plain>
          <Text type="secondary">or</Text>
        </Divider>
        <div className="text-center">
          <Text>
            Don't have an account? <Link to="/register">Create one</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
