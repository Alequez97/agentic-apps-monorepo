import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { defaultSystem, ChakraProvider } from "@chakra-ui/react";
import { Toaster } from "./components/ui/toaster";
import { useSocketStore } from "./store/useSocketStore";
import { useAuthStore } from "./store/useAuthStore";
import MarketResearchPage from "./pages/MarketResearchPage";
import { LandingPage } from "./components/market-research/LandingPage";
import { IdeaInputPage } from "./components/market-research/IdeaInputPage";
import { AnalysisPage } from "./components/market-research/AnalysisPage";
import { AnalysisSummaryPage } from "./components/market-research/AnalysisSummaryPage";
import { ProfilePage } from "./components/market-research/ProfilePage";
import { LoginPage } from "./components/market-research/LoginPage";

export default function App() {
  const initSocket = useSocketStore((s) => s.initSocket);
  const rehydrate = useAuthStore((s) => s.rehydrate);

  useEffect(() => {
    initSocket();
    rehydrate();
  }, [initSocket, rehydrate]);

  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<MarketResearchPage />}>
            <Route index element={<LandingPage />} />
            <Route path="/analyze" element={<IdeaInputPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/summary" element={<AnalysisSummaryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ChakraProvider>
  );
}
