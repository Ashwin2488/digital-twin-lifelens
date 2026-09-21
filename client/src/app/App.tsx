import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./Shell";
import { TodayPage } from "../features/today/TodayPage";
import { CustomersPage } from "../features/customers/CustomersPage";
import { TwinPage } from "../features/twin/TwinPage";
import { FutureYouPage } from "../features/futureYou/FutureYouPage";
import { DeveloperPage } from "../features/developer/DeveloperPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/client" element={<TwinPage />} />
            <Route path="/future" element={<FutureYouPage />} />
            <Route path="/developer" element={<DeveloperPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
