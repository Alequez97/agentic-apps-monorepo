import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { defaultSystem, ChakraProvider } from "@chakra-ui/react";
import { Toaster } from "./components/ui/toaster";
import { useSocketStore } from "./store/useSocketStore";
import { useAuthStore } from "./store/useAuthStore";
import MarketResearchPage from "./pages/MarketResearchPage";
import { IdeaInputPage } from "./components/market-research/IdeaInputPage";
import { AnalysisPage } from "./components/market-research/AnalysisPage";
import { AnalysisSummaryPage } from "./components/market-research/AnalysisSummaryPage";
import { ProfilePage } from "./components/market-research/ProfilePage";
import { LoginPage } from "./components/market-research/LoginPage";
import { AdminPage } from "./components/market-research/AdminPage";

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const initSocket = useSocketStore((s) => s.initSocket);
  const reconnectSocket = useSocketStore((s) => s.reconnectSocket);
  const rehydrate = useAuthStore((s) => s.rehydrate);
  const userId = useAuthStore((s) => s.user?.userId ?? null);

  useEffect(() => {
    rehydrate().finally(() => {
      setAuthReady(true);
      initSocket();
    });
  }, [initSocket, rehydrate]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    reconnectSocket();
  }, [authReady, reconnectSocket, userId]);

  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<MarketResearchPage />}>
            <Route index element={<Navigate to="/profile" replace />} />
            <Route path="/analyze" element={<IdeaInputPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/summary" element={<AnalysisSummaryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/users/:userId" element={<AdminPage />} />
            <Route path="/admin/sessions/:sessionId" element={<AdminPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ChakraProvider>
  );
}
