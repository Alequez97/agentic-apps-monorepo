import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Box, Text } from "@chakra-ui/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { ProfileHeader } from "./ProfileHeader";
import { AnalysisHistory } from "./AnalysisHistory";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const analysisHistory = useProfileStore((s) => s.analysisHistory);
  const isLoading = useProfileStore((s) => s.isLoading);
  const clearHistory = useProfileStore((s) => s.clearHistory);
  const fetchHistory = useProfileStore((s) => s.fetchHistory);
  const openHistoryAnalysis = useMarketResearchStore((s) => s.openHistoryAnalysis);
  const restartAnalysis = useMarketResearchStore((s) => s.restartAnalysis);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // If not signed in, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box minH="100vh" bg="#f8fafc" pt="116px" pb="80px">
      <Box maxW="720px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Page title */}
        <Text fontSize="22px" fontWeight="800" color="#0f172a" letterSpacing="-0.02em" mb={5}>
          My profile
        </Text>

        <ProfileHeader user={user} onSignOut={signOut} />
        <AnalysisHistory
          history={analysisHistory}
          isLoading={isLoading}
          onClear={clearHistory}
          onOpen={(entry) => {
            openHistoryAnalysis(entry);
            navigate("/summary");
          }}
          onRestart={async (entry) => {
            const started = await restartAnalysis({
              reportId: entry.id,
              idea: entry.idea,
            });
            navigate(started ? "/analysis" : "/profile");
          }}
        />
      </Box>
    </Box>
  );
}
