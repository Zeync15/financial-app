import { useState, useEffect, useRef } from "react";
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
  CreditCardOutlined,
  RetweetOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useSession, signOut } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomNav from "@/components/navigation/BottomNav";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import { FAB_EVENT } from "@/hooks/useFabAction";

const ACCENT = "#1ec98a";
const SIDER_BORDER = "rgba(255,255,255,0.08)";

const { Sider, Content } = Layout;

const SIDER_WIDTH = 200;
const SIDER_COLLAPSED_WIDTH = 80;

const topMenuItems: MenuProps["items"] = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  {
    key: "/transactions",
    icon: <TransactionOutlined />,
    label: "Transactions",
  },
  { key: "/budgets", icon: <PieChartOutlined />, label: "Budgets" },
  { key: "/categories", icon: <TagOutlined />, label: "Categories" },
  { key: "/investments", icon: <FundOutlined />, label: "Investments" },
  { key: "/loans", icon: <DollarOutlined />, label: "Loans" },
  { key: "/instalments", icon: <CreditCardOutlined />, label: "Instalments" },
  { key: "/recurring", icon: <RetweetOutlined />, label: "Recurring" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const catchUpRan = useRef(false);

  // Catch-up: on app open, post any recurring transactions that have come due
  // since last open (there is no server scheduler). Runs once per mount, then
  // signals listeners to refetch. Failures are non-fatal.
  useEffect(() => {
    if (catchUpRan.current) return;
    catchUpRan.current = true;
    api
      .post("/recurring-transactions/run", {})
      .then((res: any) => {
        if (res?.posted > 0) window.dispatchEvent(new Event("transaction-added"));
      })
      .catch(() => {});
  }, []);

  // Reset scroll to the top on every page navigation. Desktop scrolls inside
  // the Content pane (overflow-auto); mobile scrolls the document.
  //
  // On iOS Chrome/Safari the dynamic bottom toolbar collapses as you scroll;
  // when you then navigate, the browser re-expands it and reflows the layout.
  // A single synchronous scroll fires mid-transition and lands short, so we
  // also re-assert after the next paint and target the scrolling element
  // directly (window.scrollTo alone is unreliable during that animation).
  useEffect(() => {
    const toTop = () => {
      window.scrollTo(0, 0);
      const doc = document.scrollingElement ?? document.documentElement;
      doc.scrollTop = 0;
      contentRef.current?.scrollTo(0, 0);
    };
    toTop();
    const raf = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);
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

  // The FAB just signals "add" — the mounted page decides which form to open
  // (via useFabAction), so this stays page-agnostic.
  // Hide FAB on the form routes themselves so it doesn't sit on top of the
  // open drawer/modal.
  const isFormPage =
    location.pathname === "/transactions/new" ||
    location.pathname === "/investments/new" ||
    location.pathname === "/loans/new" ||
    location.pathname.endsWith("/edit");

  // Mobile: a fixed-height (100dvh) app shell where the content pane scrolls
  // internally and the bottom nav sits in normal flow. Because the document
  // body itself never scrolls, the browser's dynamic bottom toolbar stays put
  // and the nav doesn't get dragged out of place.
  if (isMobile) {
    return (
      <div
        className="app-shell"
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          ref={contentRef}
          className="p-3"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            background: "var(--bg)",
            // Clear the floating action button that overlays the pane's bottom.
            paddingBottom: "84px",
          }}
        >
          <Outlet />
        </div>
        {!isFormPage && (
          <FloatingActionButton
            onClick={() => window.dispatchEvent(new Event(FAB_EVENT))}
          />
        )}
        <BottomNav />
      </div>
    );
  }

  // Desktop keeps the locked-viewport architecture so the sidebar can sit
  // fixed alongside a scrollable content pane.
  return (
    <Layout className="h-screen overflow-hidden app-shell">
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
              justifyContent: "center",
              padding: collapsed ? 0 : "0 16px",
              gap: 10,
              borderBottom: `1px solid ${siderBorder}`,
            }}
          >
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
        className="flex flex-col h-screen"
      >
        <Content ref={contentRef} className="flex-1 overflow-auto p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
