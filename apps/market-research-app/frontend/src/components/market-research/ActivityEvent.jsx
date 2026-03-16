import { Box, HStack, Text } from "@chakra-ui/react";
import { FileText, Globe, Layers, Link, Sparkles } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

const KIND_CONFIG = {
  search: {
    Icon: Globe,
    iconColor: "#3b82f6",
    iconBg: "#eff6ff",
    label: null,
  },
  found: {
    Icon: Sparkles,
    iconColor: "#7c3aed",
    iconBg: "#f5f3ff",
    label: null,
  },
  navigate: {
    Icon: Link,
    iconColor: "#0891b2",
    iconBg: "#ecfeff",
    label: "agent",
  },
  extract: {
    Icon: Layers,
    iconColor: "#d97706",
    iconBg: "#fffbeb",
    label: "agent",
  },
  write: {
    Icon: FileText,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    label: "agent",
  },
  task_progress: {
    Icon: Layers,
    iconColor: "#475569",
    iconBg: "#f8fafc",
    label: "agent",
  },
};

function formatElapsed(timestamp, startedAt) {
  if (!startedAt) return "00:00";
  const elapsed = Math.max(0, Math.floor((timestamp - startedAt) / 1000));
  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ActivityEvent({ event }) {
  const analysisStartedAt = useMarketResearchStore((s) => s.analysisStartedAt);
  const config = KIND_CONFIG[event.kind] ?? KIND_CONFIG.search;
  const { Icon, iconColor, iconBg } = config;

  return (
    <HStack
      gap={2.5}
      align="flex-start"
      py={2}
      borderBottomWidth="1px"
      borderColor="#f8fafc"
    >
      <Box
        w="26px"
        h="26px"
        borderRadius="7px"
        bg={iconBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        mt="1px"
      >
        <Icon size={13} color={iconColor} strokeWidth={2} />
      </Box>

      <Box flex="1" minW={0}>
        {event.agent && (
          <HStack gap={1} mb={0.5}>
            <Box
              w="6px"
              h="6px"
              borderRadius="50%"
              bg={event.agentColor ?? "#64748b"}
              flexShrink={0}
            />
            <Text
              fontSize="9px"
              fontWeight="700"
              color={event.agentColor ?? "#64748b"}
              letterSpacing="0.06em"
              textTransform="uppercase"
            >
              {event.agent}
            </Text>
          </HStack>
        )}

        <Text
          fontSize="11.5px"
          fontWeight="600"
          color="#0f172a"
          lineHeight="1.3"
        >
          {event.message}
        </Text>

        {event.url && (
          <Text
            fontSize="10px"
            color="#6366f1"
            mt={0.5}
            lineHeight="1.4"
            wordBreak="break-all"
            noOfLines={1}
          >
            {event.url}
          </Text>
        )}

        {event.detail && (
          <Text fontSize="10.5px" color="#64748b" mt={0.5} lineHeight="1.4">
            {event.detail}
          </Text>
        )}
      </Box>

      <Text
        fontSize="9px"
        color="#94a3b8"
        fontVariantNumeric="tabular-nums"
        flexShrink={0}
        mt="2px"
      >
        {formatElapsed(event.timestamp, analysisStartedAt)}
      </Text>
    </HStack>
  );
}
