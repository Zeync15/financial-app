import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Layout, Menu, Button } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  BankOutlined,
  TransactionOutlined,
  FundOutlined,
  PieChartOutlined,
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useSession, signOut } from "@/lib/auth-client";

const { Sider, Content } = Layout;

const SIDER_WIDTH = 200;
const SIDER_COLLAPSED_WIDTH = 80;

const topMenuItems: MenuProps["items"] = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/accounts", icon: <BankOutlined />, label: "Accounts" },
  {
    key: "/transactions",
    icon: <TransactionOutlined />,
    label: "Transactions",
  },
  { key: "/budgets", icon: <PieChartOutlined />, label: "Budgets" },
  { key: "/investments", icon: <FundOutlined />, label: "Investments" },
  { key: "/loans", icon: <DollarOutlined />, label: "Loans" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();

  const handleTopMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
    if (isMobile) setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleBreakpoint = (broken: boolean) => {
    setIsMobile(broken);
    if (broken) setMobileOpen(false);
  };

  const siderCollapsed = isMobile ? !mobileOpen : collapsed;
  const siderCollapsedWidth = isMobile ? 0 : SIDER_COLLAPSED_WIDTH;
  const contentMarginLeft = isMobile
    ? 0
    : collapsed
      ? SIDER_COLLAPSED_WIDTH
      : SIDER_WIDTH;

  const bottomMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: session?.user?.name ?? "User",
      disabled: true,
    },
    {
      key: "signout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
    },
    ...(!isMobile
      ? [
          {
            key: "collapse",
            icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
            label: collapsed ? "Expand" : "Collapse",
          },
        ]
      : []),
  ];

  const handleBottomMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "signout") handleSignOut();
    else if (key === "collapse") setCollapsed((c) => !c);
  };

  return (
    <Layout className="h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sider
        trigger={null}
        collapsible
        collapsed={siderCollapsed}
        collapsedWidth={siderCollapsedWidth}
        width={SIDER_WIDTH}
        breakpoint="md"
        onBreakpoint={handleBreakpoint}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-white/10 shrink-0">
          <span className="text-white font-semibold text-base whitespace-nowrap">
            {siderCollapsed ? "$" : "Financial App"}
          </span>
        </div>

        {/* Top nav menu */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={topMenuItems}
            onClick={handleTopMenuClick}
          />
        </div>

        {/* Bottom user/settings menu */}
        <div className="shrink-0 border-t border-white/10">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[]}
            items={bottomMenuItems}
            onClick={handleBottomMenuClick}
          />
        </div>
      </Sider>

      {/* Main content */}
      <Layout
        style={{ marginLeft: contentMarginLeft, transition: "margin 0.2s" }}
        className="flex flex-col h-screen"
      >
        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div className="sticky top-0 z-10 px-4 py-3 flex items-center shrink-0 border-b border-white/10" style={{ background: "#001529" }}>
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: "#fff" }} />}
              onClick={() => setMobileOpen(true)}
            />
          </div>
        )}

        <Content className="flex-1 overflow-auto p-6">
          <div className="md:max-w-[80%]">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
