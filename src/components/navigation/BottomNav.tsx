import { useState } from "react";
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
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { signOut } from "@/lib/auth-client";
import { useTheme } from "@/App";

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
  const { darkMode, toggleDarkMode } = useTheme();

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
      icon: darkMode ? <SunOutlined /> : <MoonOutlined />,
      label: darkMode ? "Light Mode" : "Dark Mode",
      onClick: toggleDarkMode,
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
          background: token.colorBgContainer,
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

      <Drawer title="More" placement="bottom" height="auto" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col gap-1">
          {moreItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex items-center gap-3 px-3 py-3 rounded-lg border-none bg-transparent cursor-pointer text-left w-full"
              style={{
                color: item.danger ? token.colorError : token.colorText,
                fontSize: 16,
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Drawer>
    </>
  );
}
