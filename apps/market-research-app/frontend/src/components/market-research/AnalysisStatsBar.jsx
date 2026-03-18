import { Box, HStack, Text } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { COMPETITOR_STATUS } from "./constants";

function StatItem({ value, label }) {
  return (
    <HStack gap={1.5} align="baseline">
      <Text fontSize="22px" fontWeight="800" color="#0f172a" letterSpacing="-0.03em" lineHeight="1">
        {value}
      </Text>
      <Text
        fontSize="9px"
        fontWeight="700"
        color="#94a3b8"
        textTransform="uppercase"
        letterSpacing="0.08em"
      >
        {label}
      </Text>
    </HStack>
  );
}

export function AnalysisStatsBar() {
  const competitors = useMarketResearchStore((s) => s.competitors);
  const activityEvents = useMarketResearchStore((s) => s.activityEvents);

  const agentCount = competitors.length;
  const eventCount = activityEvents.length;
  const urlCount = activityEvents.filter((e) => e.url).length;
  const doneCount = competitors.filter((c) => c.status === COMPETITOR_STATUS.DONE).length;

  return (
    <Box borderTopWidth="1px" borderColor="#e4e4e7" bg="white" px={8} py={3} flexShrink={0}>
      <HStack gap={10} justify="center">
        <StatItem value={agentCount} label="Agents" />
        <StatItem value={eventCount} label="Events" />
        <StatItem value={urlCount} label="URLs" />
        <StatItem value={doneCount} label="Done" />
      </HStack>
    </Box>
  );
}
