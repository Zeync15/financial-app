import { useEffect, useState } from "react";
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Collapse,
  Popconfirm,
  Empty,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

interface Loan {
  id: string;
  name: string;
  principal: string;
  currency: string;
  interestRate: string;
  loanTermMonths: number;
  startDate: string;
  paymentType: string;
  monthlyPayment: number;
  totalInterest: number;
  remainingBalance: number;
  monthsPaid: number;
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{
    loan: Loan;
    schedule: AmortRow[];
  } | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api
      .get<Loan[]>("/loans")
      .then(setLoans)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await api.post("/loans", {
        ...values,
        principal: String(values.principal),
        interestRate: String(values.interestRate),
        startDate: values.startDate.format("YYYY-MM-DD"),
      });
      message.success("Loan added");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/loans/${id}`);
      message.success("Loan deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const viewSchedule = async (loan: Loan) => {
    const schedule = await api.get<AmortRow[]>(`/loans/${loan.id}/schedule`);
    setScheduleModal({ loan, schedule });
  };

  const scheduleColumns = [
    { title: "#", dataIndex: "month", key: "month", width: 60 },
    {
      title: "Payment",
      dataIndex: "payment",
      key: "payment",
      align: "right" as const,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Principal",
      dataIndex: "principal",
      key: "principal",
      align: "right" as const,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Interest",
      dataIndex: "interest",
      key: "interest",
      align: "right" as const,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      align: "right" as const,
      render: (v: number) => v.toFixed(2),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="mb-0!">
          Loans
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setModalOpen(true);
          }}
        >
          Add Loan
        </Button>
      </div>

      {loans.length === 0 && !loading ? (
        <Empty description="No loans yet" />
      ) : (
        <Row gutter={[16, 16]}>
          {loans.map((l) => (
            <Col xs={24} md={12} key={l.id}>
              <Card
                title={l.name}
                extra={
                  <div className="flex gap-2">
                    <Button size="small" onClick={() => viewSchedule(l)}>
                      Schedule
                    </Button>
                    <Popconfirm
                      title="Delete?"
                      onConfirm={() => handleDelete(l.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Principal"
                      value={Number(l.principal)}
                      prefix="RM"
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Monthly Payment"
                      value={l.monthlyPayment}
                      prefix="RM"
                      precision={2}
                    />
                  </Col>
                </Row>
                <Row gutter={16} className="mt-4">
                  <Col span={12}>
                    <Statistic
                      title="Interest Rate"
                      value={Number(l.interestRate)}
                      suffix="% p.a."
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Total Interest"
                      value={l.totalInterest}
                      prefix="RM"
                      precision={2}
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </Col>
                </Row>
                <div className="mt-4 text-sm text-gray-500">
                  <p>
                    {l.loanTermMonths} months ({l.paymentType.replace("_", " ")}
                    ) | Started: {l.startDate}
                  </p>
                  <p>
                    Remaining: RM {l.remainingBalance.toFixed(2)} |{" "}
                    {l.monthsPaid}/{l.loanTermMonths} months paid
                  </p>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="New Loan"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currency: "MYR", paymentType: "fixed" }}
        >
          <Form.Item name="name" label="Loan Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Home Loan" />
          </Form.Item>
          <Form.Item
            name="principal"
            label="Principal Amount"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" precision={2} min={1} />
          </Form.Item>
          <Form.Item
            name="interestRate"
            label="Interest Rate (% p.a.)"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" precision={2} min={0} max={100} />
          </Form.Item>
          <Form.Item
            name="loanTermMonths"
            label="Term (months)"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item
            name="paymentType"
            label="Payment Type"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "fixed", label: "Fixed Rate (Flat Rate / Hire Purchase)" },
                { value: "reducing_balance", label: "Variable Rate (Reducing Balance / Amortization)" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          scheduleModal
            ? `${scheduleModal.loan.name} - Amortization Schedule`
            : ""
        }
        open={!!scheduleModal}
        onCancel={() => setScheduleModal(null)}
        footer={null}
        width={700}
      >
        {scheduleModal && (
          <Table
            dataSource={scheduleModal.schedule}
            columns={scheduleColumns}
            rowKey="month"
            pagination={{ pageSize: 12 }}
            size="small"
            scroll={{ y: 400 }}
          />
        )}
      </Modal>
    </div>
  );
}
