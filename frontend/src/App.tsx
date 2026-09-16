import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/protected-route";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/layouts/app-layout";
import Accounts from "@/pages/accounts";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Notifications from "@/pages/notifications";
import Register from "@/pages/register";
import Transactions from "@/pages/transactions";
import Transfer from "@/pages/transfer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
});

const protectedPages: Array<{ path: string; element: React.ReactNode }> = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/accounts", element: <Accounts /> },
  { path: "/transfer", element: <Transfer /> },
  { path: "/transactions", element: <Transactions /> },
  { path: "/notifications", element: <Notifications /> },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {protectedPages.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <AppLayout>{element}</AppLayout>
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
