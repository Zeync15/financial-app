import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme, Spin, App as AntdApp } from "antd";
import { useSession } from "@/lib/auth-client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Budgets from "@/pages/Budgets";
import Investments from "@/pages/Investments";
import Loans from "@/pages/Loans";
import Instalments from "@/pages/Instalments";
import RecurringTransactions from "@/pages/RecurringTransactions";
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
          // Every elevated Ant surface inside forms (modals, drawers, select
          // dropdowns, date/color pickers, confirm dialogs) uses the same
          // panel color as the rest of the app.
          colorBgElevated: "#161c23",
        },
        components: {
          Input: {
            hoverBorderColor: ACCENT,
            activeBorderColor: ACCENT,
          },
        },
      }}
    >
      <AntdApp component={false}>
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
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Transactions is the landing page; Dashboard lives at /dashboard */}
            <Route path="/" element={<Navigate to="/transactions" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Accounts merged into the Dashboard; keep old links working */}
            <Route path="/accounts" element={<Navigate to="/dashboard" replace />} />
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
            <Route path="/instalments" element={<Instalments />} />
            <Route path="/instalments/new" element={<Instalments />} />
            <Route path="/recurring" element={<RecurringTransactions />} />
            <Route path="/recurring/new" element={<RecurringTransactions />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
