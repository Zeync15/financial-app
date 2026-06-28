import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme, Spin } from "antd";
import { useSession } from "@/lib/auth-client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Budgets from "@/pages/Budgets";
import Investments from "@/pages/Investments";
import Loans from "@/pages/Loans";
import Categories from "@/pages/Categories";

const ACCENT = "#1ec98a";
const BORDER = "rgba(255,255,255,0.34)";

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
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: ACCENT,
          colorBorder: BORDER,
          borderRadius: 8,
        },
        components: {
          Input: {
            hoverBorderColor: ACCENT,
            activeBorderColor: ACCENT,
          },
        },
      }}
    >
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
            {/* Accounts merged into Home; keep old links working */}
            <Route path="/accounts" element={<Navigate to="/" replace />} />
            {/* /new and /:id/edit render the same Transactions page —
                the drawer auto-opens based on the URL. Closing it navigates
                back to /transactions. */}
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<Transactions />} />
            <Route path="/transactions/:id/edit" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/investments/new" element={<Investments />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/new" element={<Loans />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
