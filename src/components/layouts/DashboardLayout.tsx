import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  BankOutlined,
  TransactionOutlined,
  FundOutlined,
  PieChartOutlined,
  TagOutlined,
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useSession, signOut } from "@/lib/auth-client";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomNav from "@/components/navigation/BottomNav";
import FloatingActionButton from "@/components/common/FloatingActionButton";

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
  { key: "/categories", icon: <TagOutlined />, label: "Categories" },
  { key: "/investments", icon: <FundOutlined />, label: "Investments" },
  { key: "/loans", icon: <DollarOutlined />, label: "Loans" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();
  const isMobile = useIsMobile();

  const handleTopMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
    { key: "signout", icon: <LogoutOutlined />, label: "Sign Out" },
    {
      key: "collapse",
      icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
      label: collapsed ? "Expand" : "Collapse",
    },
  ];

  const handleBottomMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "signout") handleSignOut();
    else if (key === "collapse") setCollapsed((c) => !c);
  };

  // Hide FAB on the form pages (they have their own back button)
  const isFormPage =
    location.pathname === "/transactions/new" ||
    location.pathname.endsWith("/edit");

  return (
    <Layout className="h-screen overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          width={SIDER_WIDTH}
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
          <div className="h-16 flex items-center justify-center border-b border-white/10 shrink-0">
            <span className="text-white font-semibold text-base whitespace-nowrap">
              {collapsed ? "$" : "Financial App"}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={topMenuItems}
              onClick={handleTopMenuClick}
            />
          </div>

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
      )}

      {/* Main content */}
      <Layout
        style={{ marginLeft: contentMarginLeft, transition: "margin 0.2s" }}
        className="flex flex-col h-screen"
      >
        <Content
          className={isMobile ? "flex-1 overflow-auto p-3" : "flex-1 overflow-auto p-6"}
          style={
            isMobile
              ? {
                  paddingBottom:
                    "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)",
                }
              : undefined
          }
        >
          <div className={isMobile ? "" : "md:max-w-[80%]"}>
            <Outlet />
          </div>
        </Content>
      </Layout>

      {/* Mobile: FAB (hidden on form pages) + bottom nav */}
      {isMobile && !isFormPage && (
        <FloatingActionButton onClick={() => navigate("/transactions/new")} />
      )}
      {isMobile && <BottomNav />}
    </Layout>
  );
}
