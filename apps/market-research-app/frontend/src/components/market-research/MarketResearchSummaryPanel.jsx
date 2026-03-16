import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

const shimmerStyle = {
  "@keyframes shimmer": {
    "0%": { backgroundPosition: "-400px 0" },
    "100%": { backgroundPosition: "400px 0" },
  },
  animation: "shimmer 1.6s ease-in-out infinite",
  background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%)",
  backgroundSize: "800px 100%",
};

function SkeletonBlock({ h, w = "full", borderRadius = "6px" }) {
  return <Box h={h} w={w} borderRadius={borderRadius} css={shimmerStyle} />;
}

const STATUS_COPY = {
  "finding-competitors": {
    title: "Finding competitors",
    description:
      "The initial agent is identifying relevant competitors and reserving stable space for the final summary.",
  },
  "waiting-competitors": {
    title: "Collecting competitor insights",
    description:
      "Competitor analysts are filling in pricing, strengths, weaknesses, and evidence while the layout stays fixed.",
  },
  summarizing: {
    title: "Reasoning about the market",
    description:
      "All competitor research is in. The summary agent is now reading the full competitor set and deciding whether this market is actually worth entering.",
  },
  ready: {
    title: "Summary ready",
    description:
      "The final verdict and cross-competitor insights are ready to review.",
  },
  failed: {
    title: "Summary failed",
    description:
      "Competitor research finished, but the market verdict could not be generated. No fallback guess is shown.",
  },
};

export function MarketResearchSummaryPanel() {
  const summaryStatus = useMarketResearchStore((s) => s.summaryStatus);
  const isAnalysisComplete = useMarketResearchStore((s) => s.isAnalysisComplete);

  if (summaryStatus === "idle" && !isAnalysisComplete) {
    return null;
  }

  const copy = STATUS_COPY[summaryStatus] || STATUS_COPY["finding-competitors"];

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
      minH="242px"
    >
      <HStack justify="space-between" align="start" mb={4}>
        <VStack align="start" gap={1}>
          <Text
            fontSize="11px"
            fontWeight="700"
            color="#94a3b8"
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            Summary
          </Text>
          <Text fontSize="18px" fontWeight="800" color="#0f172a">
            {copy.title}
          </Text>
          <Text fontSize="12px" color="#64748b" lineHeight="1.55" maxW="620px">
            {copy.description}
          </Text>
        </VStack>
        <Box
          px={2.5}
          py={1}
          borderRadius="9999px"
          bg={
            summaryStatus === "ready"
              ? "#dcfce7"
              : summaryStatus === "failed"
                ? "#fee2e2"
                : "#eef2ff"
          }
          color={
            summaryStatus === "ready"
              ? "#166534"
              : summaryStatus === "failed"
                ? "#b91c1c"
                : "#4f46e5"
          }
          fontSize="11px"
          fontWeight="700"
        >
          {summaryStatus === "ready"
            ? "Ready"
            : summaryStatus === "failed"
              ? "Failed"
              : "Loading"}
        </Box>
      </HStack>

      <VStack align="stretch" gap={4}>
        <SkeletonBlock h="74px" borderRadius="12px" />
        <HStack align="stretch" gap={4}>
          <SkeletonBlock h="108px" w="full" borderRadius="12px" />
          <SkeletonBlock h="108px" w="full" borderRadius="12px" />
        </HStack>
      </VStack>
    </Box>
  );
}
