import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { ActivityEvent } from "./ActivityEvent";

export function ActivityFeed() {
  const activityEvents = useMarketResearchStore((s) => s.activityEvents);
  const isAnalyzing = useMarketResearchStore((s) => s.isAnalyzing);

  const handleClear = () => {
    useMarketResearchStore.setState({ activityEvents: [] });
  };

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        justify="space-between"
        px={5}
        py={3}
        borderBottomWidth="1px"
        borderColor="#f1f5f9"
      >
        <HStack gap={2.5}>
          <Text fontSize="12px" fontWeight="700" color="#0f172a">
            Activity
          </Text>
          {isAnalyzing && (
            <HStack
              gap={1.5}
              bg="#f0fdf4"
              borderRadius="9999px"
              px={2}
              py={0.5}
            >
              <Box
                w="5px"
                h="5px"
                borderRadius="50%"
                bg="#16a34a"
                css={{
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                  },
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <Text fontSize="9px" fontWeight="700" color="#15803d">
                Live
              </Text>
            </HStack>
          )}
          <Text fontSize="10px" color="#94a3b8">
            {activityEvents.length} events
          </Text>
        </HStack>

        <Button
          variant="ghost"
          size="xs"
          fontSize="11px"
          color="#94a3b8"
          _hover={{ color: "#64748b" }}
          onClick={handleClear}
        >
          Clear
        </Button>
      </HStack>

      {/* Event list */}
      <VStack align="stretch" gap={0} px={5} py={2}>
        {activityEvents.length === 0 ? (
          isAnalyzing ? (
            <Box
              py={10}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={4}
            >
              {/* Ripple rings */}
              <Box position="relative" w="40px" h="40px">
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    position="absolute"
                    inset={0}
                    borderRadius="50%"
                    borderWidth="1.5px"
                    borderColor="#818cf8"
                    css={{
                      "@keyframes ripple": {
                        "0%": { transform: "scale(0.6)", opacity: 0.9 },
                        "100%": { transform: "scale(2.2)", opacity: 0 },
                      },
                      animation: `ripple 2s ease-out ${i * 0.6}s infinite`,
                    }}
                  />
                ))}
                <Box
                  position="absolute"
                  inset={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box
                    w="12px"
                    h="12px"
                    borderRadius="50%"
                    bg="#6366f1"
                    css={{
                      "@keyframes pulse": {
                        "0%, 100%": { transform: "scale(0.9)", opacity: 0.8 },
                        "50%": { transform: "scale(1.1)", opacity: 1 },
                      },
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </Box>
              </Box>
              <Text fontSize="11px" color="#94a3b8" fontWeight="500">
                Waiting for activity
              </Text>
            </Box>
          ) : (
            <Box py={10} textAlign="center">
              <Text fontSize="20px" mb={2}>
                📋
              </Text>
              <Text fontSize="12px" fontWeight="600" color="#475569" mb={0.5}>
                No activity yet
              </Text>
              <Text fontSize="11px" color="#94a3b8">
                Events will appear here as the AI works.
              </Text>
            </Box>
          )
        ) : (
          activityEvents.map((event) => (
            <ActivityEvent key={event.id} event={event} />
          ))
        )}
      </VStack>
    </Box>
  );
}
