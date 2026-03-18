import { Box, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorCard } from "./CompetitorCard";

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

function SkeletonCard({ delay = 0 }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={4}
      opacity={1}
      css={{
        "@keyframes fadeIn": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        animation: `fadeIn 0.4s ease ${delay}s both`,
      }}
    >
      <VStack align="start" gap={3}>
        {/* header row */}
        <HStack justify="space-between" w="full">
          <HStack gap={2}>
            <SkeletonBlock h="32px" w="32px" borderRadius="8px" />
            <VStack align="start" gap={1.5}>
              <SkeletonBlock h="11px" w="90px" />
              <SkeletonBlock h="9px" w="60px" />
            </VStack>
          </HStack>
          <SkeletonBlock h="20px" w="52px" borderRadius="9999px" />
        </HStack>
        {/* description */}
        <VStack align="start" gap={1.5} w="full">
          <SkeletonBlock h="9px" w="full" />
          <SkeletonBlock h="9px" w="80%" />
        </VStack>
        {/* pills */}
        <HStack gap={1.5} flexWrap="wrap">
          <SkeletonBlock h="18px" w="48px" borderRadius="9999px" />
          <SkeletonBlock h="18px" w="60px" borderRadius="9999px" />
          <SkeletonBlock h="18px" w="40px" borderRadius="9999px" />
        </HStack>
      </VStack>
    </Box>
  );
}

export function CompetitorsGrid() {
  const competitors = useMarketResearchStore((s) => s.competitors);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);
  const latestActivityEvent = useMarketResearchStore((s) =>
    s.latestActivityEvent(),
  );

  if (competitors.length === 0) {
    if (isAnalyzing) {
      return (
        <Box>
          <HStack gap={1.5} mb={3}>
            <Box
              w="6px"
              h="6px"
              borderRadius="50%"
              bg="#6366f1"
              css={{
                "@keyframes bounce": {
                  "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 },
                  "40%": { transform: "scale(1)", opacity: 1 },
                },
                animation: "bounce 1.2s ease-in-out infinite",
              }}
            />
            <Box
              w="6px"
              h="6px"
              borderRadius="50%"
              bg="#818cf8"
              css={{
                "@keyframes bounce": {
                  "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 },
                  "40%": { transform: "scale(1)", opacity: 1 },
                },
                animation: "bounce 1.2s ease-in-out 0.2s infinite",
              }}
            />
            <Box
              w="6px"
              h="6px"
              borderRadius="50%"
              bg="#a5b4fc"
              css={{
                "@keyframes bounce": {
                  "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 },
                  "40%": { transform: "scale(1)", opacity: 1 },
                },
                animation: "bounce 1.2s ease-in-out 0.4s infinite",
              }}
            />
            <Text
              fontSize="11px"
              color="#6366f1"
              fontWeight="600"
              letterSpacing="0.01em"
            >
              Scanning the web for competitors...
            </Text>
          </HStack>
          {latestActivityEvent && (
            <Box
              mb={4}
              px={3}
              py={2}
              bg="white"
              borderRadius="8px"
              borderWidth="1px"
              borderColor="#e2e8f0"
              css={{
                "@keyframes fadeSlideIn": {
                  "0%": { opacity: 0, transform: "translateY(4px)" },
                  "100%": { opacity: 1, transform: "translateY(0)" },
                },
                animation: "fadeSlideIn 0.3s ease",
              }}
            >
              <Text
                fontSize="11px"
                color="#64748b"
                fontWeight="500"
                noOfLines={1}
              >
                <Text as="span" color="#6366f1" fontWeight="700" mr={1.5}>
                  {latestActivityEvent.agent ?? "Agent"}
                </Text>
                {latestActivityEvent.message}
              </Text>
            </Box>
          )}
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              xl: "repeat(3, 1fr)",
            }}
            autoRows="1fr"
            gap={4}
          >
            <SkeletonCard delay={0} />
            <SkeletonCard delay={0.08} />
            <SkeletonCard delay={0.16} />
          </Grid>
        </Box>
      );
    }

    return (
      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={14}
        textAlign="center"
      >
        <Text fontSize="22px" mb={2}>
          🔍
        </Text>
        <Text fontSize="13px" fontWeight="600" color="#475569" mb={1}>
          No competitors yet
        </Text>
        <Text fontSize="12px" color="#94a3b8">
          Start an analysis to discover competitors.
        </Text>
      </Box>
    );
  }

  return (
    <Grid
      templateColumns={{
        base: "1fr",
        md: "repeat(2, 1fr)",
        xl: "repeat(3, 1fr)",
      }}
      autoRows="1fr"
      gap={4}
    >
      {competitors.map((competitor) => (
        <CompetitorCard key={competitor.id} competitor={competitor} />
      ))}
    </Grid>
  );
}
