import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { defaultSystem, ChakraProvider } from "@chakra-ui/react";
import { Toaster } from "./components/ui/toaster";
import { useSocketStore } from "./store/useSocketStore";
import { useAuthStore } from "./store/useAuthStore";
import { useLocationStore } from "./store/useLocationStore";
import MarketResearchPage from "./pages/MarketResearchPage";

export default function App() {
  const initSocket = useSocketStore((s) => s.initSocket);
  const rehydrate = useAuthStore((s) => s.rehydrate);
  const initLocation = useLocationStore((s) => s.init);

  useEffect(() => {
    initSocket();
    rehydrate();
    const cleanupLocation = initLocation();
    return cleanupLocation;
  }, [initSocket, rehydrate, initLocation]);

  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<MarketResearchPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ChakraProvider>
  );
}
