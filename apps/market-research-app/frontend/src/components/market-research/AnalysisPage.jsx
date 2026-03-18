import { useEffect, useState } from "react";
import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorsGrid } from "./CompetitorsGrid";
import { ActivityFeed } from "./ActivityFeed";
import { CompetitorDetails } from "./CompetitorDetails";
import { MarketResearchSummaryPanel } from "./MarketResearchSummaryPanel";

function ProgressBar() {
  const competitors = useMarketResearchStore((s) => s.competitors);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);
  const isAnalysisComplete = useMarketResearchStore((s) => s.isAnalysisComplete);

  const total = competitors.length;
  const doneCount = competitors.filter((c) => c.status === "done").length;
  const analyzingNow = competitors.find((c) => c.status === "analyzing");

  if (total === 0) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <Box w="full">
      <Box h="3px" bg="#f1f5f9" borderRadius="9999px" overflow="hidden" mb={2}>
        <Box
          h="full"
          bg={isAnalysisComplete ? "#16a34a" : "#6366f1"}
          w={`${pct}%`}
          borderRadius="9999px"
          transition="width 0.5s ease"
        />
      </Box>
      {isAnalysisComplete ? (
        <Text fontSize="11px" color="#15803d" fontWeight="600">
          ✓ All {total} competitors analyzed
        </Text>
      ) : (
        <Text fontSize="11px" color="#64748b">
          <Text as="span" fontWeight="700" color="#0f172a">
            {doneCount}
          </Text>
          {" / "}
          {total} analyzed
          {analyzingNow && (
            <Text as="span" color="#94a3b8">
              {" · "}
              analyzing{" "}
              <Text as="span" fontWeight="500" color="#64748b">
                {analyzingNow.name}
              </Text>
              ...
            </Text>
          )}
        </Text>
      )}
    </Box>
  );
}

function TabBar({ active, onChange, activityCount, isAnalyzing }) {
  const tabs = [
    { id: "competitors", label: "Competitors" },
    {
      id: "activity",
      label: activityCount > 0 ? `Activity · ${activityCount}` : "Activity",
    },
  ];

  return (
    <HStack gap="2px" bg="#f1f5f9" borderRadius="10px" p="3px" display="inline-flex">
      {tabs.map(({ id, label }) => (
        <Button
          key={id}
          h="28px"
          px={3.5}
          fontSize="12px"
          fontWeight="600"
          borderRadius="8px"
          bg={active === id ? "white" : "transparent"}
          color={active === id ? "#0f172a" : "#64748b"}
          boxShadow={active === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none"}
          _hover={{
            bg: active === id ? "white" : "rgba(0,0,0,0.04)",
            color: active === id ? "#0f172a" : "#374151",
          }}
          onClick={() => onChange(id)}
        >
          {id === "activity" && isAnalyzing && (
            <Box
              w="5px"
              h="5px"
              borderRadius="50%"
              bg="#ef4444"
              mr={1.5}
              flexShrink={0}
              css={{
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.4 },
                },
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          )}
          {label}
        </Button>
      ))}
    </HStack>
  );
}

export function AnalysisPage() {
  const [activeTab, setActiveTab] = useState("competitors");
  const idea = useMarketResearchStore((s) => s.idea);
  const activityEvents = useMarketResearchStore((s) => s.activityEvents);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);
  const isAnalysisComplete = useMarketResearchStore((s) => s.isAnalysisComplete);
  const cancelAnalysis = useMarketResearchStore((s) => s.cancelAnalysis);
  const hydrateAnalysis = useMarketResearchStore((s) => s.hydrateAnalysis);
  const reportId = useMarketResearchStore((s) => s.reportId);
  const navigate = useNavigate();
  const goToSummary = () => {
    navigate("/summary");
  };
  const selectedCompetitorId = useMarketResearchStore((s) => s.selectedCompetitorId);
  const clearSelectedCompetitor = useMarketResearchStore((s) => s.clearSelectedCompetitor);
  const competitors = useMarketResearchStore((s) => s.competitors);

  const selectedCompetitor = competitors.find((c) => c.id === selectedCompetitorId) ?? null;

  useEffect(() => {
    if (!reportId) return;
    if (competitors.length > 0 || activityEvents.length > 0 || isAnalysisComplete) return;
    hydrateAnalysis(reportId);
  }, [
    reportId,
    competitors.length,
    activityEvents.length,
    isAnalysisComplete,
    hydrateAnalysis,
  ]);

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Box maxW="1024px" mx="auto" px={6} pt="72px" pb={12}>
        {/* Page header */}
        <VStack align="start" gap={0.5} mb={8}>
          <Text fontSize="26px" fontWeight="800" color="#0f172a" letterSpacing="-0.025em">
            Market Analysis
          </Text>
          {idea && (
            <Text fontSize="13px" color="#64748b" lineHeight="1.5">
              Analyzing:{" "}
              <Text as="span" fontWeight="600" color="#475569">
                {idea}
              </Text>
            </Text>
          )}
        </VStack>

        {selectedCompetitor ? (
          <CompetitorDetails
            competitor={selectedCompetitor}
            onBack={() => {
              clearSelectedCompetitor();
              setActiveTab("competitors");
            }}
          />
        ) : (
          <>
            {/* Tabs + progress */}
            <VStack align="start" gap={3} mb={6}>
              <HStack gap={3} align="center">
                <TabBar
                  active={activeTab}
                  onChange={setActiveTab}
                  activityCount={activityEvents.length}
                  isAnalyzing={isAnalyzing}
                />
                {isAnalyzing && (
                  <Button
                    h="28px"
                    px={3.5}
                    fontSize="12px"
                    fontWeight="700"
                    borderRadius="8px"
                    bg="#fff1f2"
                    color="#be123c"
                    borderWidth="1px"
                    borderColor="#fecdd3"
                    _hover={{ bg: "#ffe4e6" }}
                    onClick={async () => {
                      const canceled = await cancelAnalysis();
                      if (canceled) {
                        navigate("/analyze");
                      }
                    }}
                  >
                    Cancel Analysis
                  </Button>
                )}
                {isAnalysisComplete && (
                  <Button
                    h="28px"
                    px={3.5}
                    fontSize="12px"
                    fontWeight="700"
                    borderRadius="8px"
                    bg="linear-gradient(135deg, #6366f1, #7c3aed)"
                    color="white"
                    _hover={{ opacity: 0.9 }}
                    onClick={goToSummary}
                  >
                    View Summary →
                  </Button>
                )}
              </HStack>
              {activeTab === "competitors" && <ProgressBar />}
            </VStack>

            {/* Tab content */}
            {activeTab === "competitors" ? (
              <VStack align="stretch" gap={4}>
                <CompetitorsGrid />
                <MarketResearchSummaryPanel />
              </VStack>
            ) : (
              <ActivityFeed />
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
