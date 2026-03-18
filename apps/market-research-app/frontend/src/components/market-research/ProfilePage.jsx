import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { ArrowRight, LogIn, Search } from "lucide-react";
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
  const isDeleting = useProfileStore((s) => s.isDeleting);
  const clearHistory = useProfileStore((s) => s.clearHistory);
  const fetchHistory = useProfileStore((s) => s.fetchHistory);
  const removeAnalysis = useProfileStore((s) => s.removeAnalysis);
  const openHistoryAnalysis = useMarketResearchStore((s) => s.openHistoryAnalysis);
  const restartAnalysis = useMarketResearchStore((s) => s.restartAnalysis);
  const removeReportFromState = useMarketResearchStore((s) => s.removeReportFromState);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [fetchHistory, user]);

  if (!user) {
    return (
      <Box minH="100vh" bg="#f8fafc" pt="116px" pb="80px">
        <Box maxW="720px" mx="auto" px={{ base: 4, md: 6 }}>
          <Text fontSize="22px" fontWeight="800" color="#0f172a" letterSpacing="-0.02em" mb={5}>
            Profile
          </Text>

          <Box bg="white" borderWidth="1px" borderColor="#e2e8f0" borderRadius="16px" p={6}>
            <VStack align="start" gap={4}>
              <HStack
                w="48px"
                h="48px"
                borderRadius="14px"
                bg="#eef2ff"
                justify="center"
                color="#4f46e5"
              >
                <Search size={20} />
              </HStack>
              <Box>
                <Text fontSize="18px" fontWeight="800" color="#0f172a" mb={1}>
                  Sign in to save your research
                </Text>
                <Text fontSize="14px" color="#64748b" lineHeight="1.6">
                  Your profile stores credits, subscription details, and every market analysis you
                  run. Anonymous visitors do not have analysis history yet.
                </Text>
              </Box>
              <HStack gap={2} flexWrap="wrap">
                <Button
                  h="40px"
                  px={4}
                  borderRadius="10px"
                  bg="#0f172a"
                  color="white"
                  fontWeight="700"
                  onClick={() => navigate("/login", { state: { returnTo: "/profile" } })}
                >
                  <LogIn size={14} />
                  Sign in
                </Button>
                <Button
                  h="40px"
                  px={4}
                  borderRadius="10px"
                  variant="outline"
                  borderColor="#cbd5e1"
                  color="#334155"
                  fontWeight="700"
                  onClick={() => navigate("/analyze")}
                >
                  Start new research
                  <ArrowRight size={14} />
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="#f8fafc" pt="116px" pb="80px">
      <Box maxW="720px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Page title */}
        <Text fontSize="22px" fontWeight="800" color="#0f172a" letterSpacing="-0.02em" mb={5}>
          My profile
        </Text>

        <ProfileHeader
          user={user}
          onSignOut={signOut}
          onStartResearch={() => navigate("/analyze")}
        />
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
          onDelete={async (entry) => {
            const confirmed = window.confirm(
              `Delete the report "${entry.idea || "Untitled analysis"}"?`,
            );
            if (!confirmed) return;

            const removed = await removeAnalysis(entry.id);
            if (!removed) return;

            removeReportFromState(entry.id);
            navigate("/profile");
          }}
          isDeleting={isDeleting}
        />
      </Box>
    </Box>
  );
}
