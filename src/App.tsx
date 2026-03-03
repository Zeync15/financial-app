import { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme, Spin, Button } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useSession } from "@/lib/auth-client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Transactions from "@/pages/Transactions";
import Budgets from "@/pages/Budgets";
import Investments from "@/pages/Investments";
import Loans from "@/pages/Loans";

// --- Theme Context ---
interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// --- Global theme toggle — fixed top-right, always visible ---
function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <Button
      shape="circle"
      icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
      onClick={toggleDarkMode}
      style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}
    />
  );
}

// --- Route Guards ---
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending)
    return <Spin size="large" className="flex justify-center mt-40" />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending)
    return <Spin size="large" className="flex justify-center mt-40" />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("darkMode") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("darkMode", String(darkMode));
    } catch {
      // ignore
    }
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <ConfigProvider
        theme={{
          token: { colorPrimary: "#1677ff", borderRadius: 6 },
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <ThemeToggle />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/loans" element={<Loans />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
