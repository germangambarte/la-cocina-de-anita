import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/auth-provider";
import { ProtectedRoute } from "./components/protected-route";

const PedidosList = lazy(() =>
  import("./pages/pedidos-list").then((m) => ({ default: m.PedidosList })),
);
const Login = lazy(() =>
  import("./pages/login").then((m) => ({ default: m.Login })),
);

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 text-slate-900">
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center text-slate-500 font-black text-xl">
                  Cargando...
                </div>
              }
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <PedidosList />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
