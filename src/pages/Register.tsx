import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message, Divider } from "antd";
import { MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { signUp } from "@/lib/auth-client";

const { Title, Text } = Typography;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: {
    name: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const result = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        message.error(result.error.message ?? "Registration failed");
      } else {
        message.success("Account created!");
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
            Create Account
          </Title>
          <Text type="secondary">Get started with your financial journey</Text>
        </div>
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: "Enter your name" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Full Name"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[
              { required: true, type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, min: 8, message: "At least 8 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
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
              Create Account
            </Button>
          </Form.Item>
        </Form>
        <Divider plain>
          <Text type="secondary">or</Text>
        </Divider>
        <div className="text-center">
          <Text>
            Already have an account? <Link to="/login">Sign in</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
