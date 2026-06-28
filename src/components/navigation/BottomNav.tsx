import { Fragment, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Drawer, theme } from "antd";
import {
  UnorderedListOutlined,
  PieChartOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  FundOutlined,
  DollarOutlined,
  TagOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { signOut } from "@/lib/auth-client";

const { useToken } = theme;

interface NavTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  route?: string;
}

const tabs: NavTab[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <DashboardOutlined />,
    route: "/",
  },
  {
    key: "transaction",
    label: "Transactions",
    icon: <UnorderedListOutlined />,
    route: "/transactions",
  },
  {
    key: "investments",
    label: "Investments",
    icon: <FundOutlined />,
    route: "/investments",
  },
  {
    key: "loans",
    label: "Loans",
    icon: <DollarOutlined />,
    route: "/loans",
  },
  { key: "more", label: "More", icon: <AppstoreOutlined /> },
];

export default function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useToken();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const activeKey = tabs.find((t) => t.route === location.pathname)?.key ?? "";

  const handleTabClick = (tab: NavTab) => {
    if (tab.key === "more") {
      setDrawerOpen(true);
    } else if (tab.route) {
      navigate(tab.route);
    }
  };

  const moreItems = [
    {
      icon: <PieChartOutlined />,
      label: "Budgets",
      onClick: () => {
        navigate("/budgets");
        setDrawerOpen(false);
      },
    },
    {
      icon: <TagOutlined />,
      label: "Categories",
      onClick: () => {
        navigate("/categories");
        setDrawerOpen(false);
      },
    },
    {
      icon: <LogoutOutlined />,
      label: "Sign Out",
      onClick: handleSignOut,
      danger: true,
    },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t pb-safe"
        style={{
          height: "var(--bottom-nav-height)",
          background: "var(--sider-bg)",
          borderColor: token.colorBorderSecondary,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 border-none bg-transparent cursor-pointer"
              style={{
                color: isActive ? token.colorPrimary : token.colorTextSecondary,
              }}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <Drawer
        placement="bottom"
        height="auto"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="more-sheet"
        closable={false}
      >
        <div className="sheet-grip" />
        <div className="more-head">
          <span>More</span>
          <button
            className="more-x"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="more-list">
          {moreItems.map((item, i) => {
            const isLast = i === moreItems.length - 1 && item.danger;
            return (
              <Fragment key={item.label}>
                {isLast && <div className="more-sep" />}
                <button
                  onClick={item.onClick}
                  className={"more-item" + (item.danger ? " more-danger" : "")}
                >
                  <span className="more-ic">{item.icon}</span>
                  <span className="more-lbl">{item.label}</span>
                  {!item.danger && <span className="more-chev">›</span>}
                </button>
              </Fragment>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
