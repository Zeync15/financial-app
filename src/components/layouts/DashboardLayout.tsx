import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  TransactionOutlined,
  FundOutlined,
  PieChartOutlined,
  TagOutlined,
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useSession, signOut } from "@/lib/auth-client";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomNav from "@/components/navigation/BottomNav";
import FloatingActionButton from "@/components/common/FloatingActionButton";

const ACCENT = "#1ec98a";
const SIDER_BORDER = "rgba(255,255,255,0.08)";

const { Sider, Content } = Layout;

const SIDER_WIDTH = 200;
const SIDER_COLLAPSED_WIDTH = 80;

const topMenuItems: MenuProps["items"] = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
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
  const accent = ACCENT;
  const siderBorder = SIDER_BORDER;
  const brandTextColor = "#fff";

  const handleTopMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const contentMarginLeft = isMobile ? 0 : collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH;

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

  // FAB target depends on the current section: each section has its own
  // /new route that opens the appropriate add form drawer.
  const fabTarget = location.pathname.startsWith("/investments")
    ? "/investments/new"
    : location.pathname.startsWith("/loans")
      ? "/loans/new"
      : "/transactions/new";
  // Hide FAB on the form routes themselves so it doesn't sit on top of the
  // open drawer/modal.
  const isFormPage =
    location.pathname === "/transactions/new" ||
    location.pathname === "/investments/new" ||
    location.pathname === "/loans/new" ||
    location.pathname.endsWith("/edit");

  // Mobile: let the document body scroll naturally — no nested
  // overflow-auto container (iOS handles the page scroller far more
  // reliably than a nested one). Desktop keeps the locked-viewport
  // architecture so the sidebar can sit fixed alongside a scrollable pane.
  return (
    <Layout
      className={isMobile ? "app-shell" : "h-screen overflow-hidden app-shell"}
    >
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          width={SIDER_WIDTH}
          className="app-sider"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: `1px solid ${siderBorder}`,
          }}
        >
          <div
            className="h-16 flex items-center shrink-0"
            style={{
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? 0 : "0 16px",
              gap: 10,
              borderBottom: `1px solid ${siderBorder}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: accent,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 10px ${accent}55`,
                flexShrink: 0,
              }}
            >
              <WalletOutlined style={{ fontSize: 18, color: "#06241a" }} />
            </div>
            {!collapsed && (
              <span
                style={{
                  color: brandTextColor,
                  fontWeight: 600,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                }}
              >
                Financial App
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={topMenuItems}
              onClick={handleTopMenuClick}
              style={{ background: "transparent", borderInlineEnd: "none" }}
            />
          </div>

          <div
            className="shrink-0"
            style={{ borderTop: `1px solid ${siderBorder}` }}
          >
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[]}
              items={bottomMenuItems}
              onClick={handleBottomMenuClick}
              style={{ background: "transparent", borderInlineEnd: "none" }}
            />
          </div>
        </Sider>
      )}

      {/* Main content */}
      <Layout
        style={{ marginLeft: contentMarginLeft, transition: "margin 0.2s" }}
        className={isMobile ? "flex flex-col" : "flex flex-col h-screen"}
      >
        <Content
          // Mobile: no flex-1 / overflow-auto — Content is just a normal
          // block, the document scrolls. Padding-bottom clears the fixed
          // BottomNav + FAB.
          className={isMobile ? "p-3" : "flex-1 overflow-auto p-6"}
          style={
            isMobile
              ? {
                  paddingBottom:
                    "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)",
                  background: "var(--bg)",
                }
              : undefined
          }
        >
          <Outlet />
        </Content>
      </Layout>

      {/* Mobile: FAB (hidden on form pages) + bottom nav */}
      {isMobile && !isFormPage && (
        <FloatingActionButton onClick={() => navigate(fabTarget)} />
      )}
      {isMobile && <BottomNav />}
    </Layout>
  );
}
