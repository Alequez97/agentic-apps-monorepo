import { Box, HStack, Text, VStack } from "@chakra-ui/react";

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="9px"
      fontWeight="700"
      color="#94a3b8"
      textTransform="uppercase"
      letterSpacing="0.08em"
      mb={3}
    >
      {children}
    </Text>
  );
}

export function CompetitorFeaturesCard({ features }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>Features detected</SectionLabel>
      <VStack align="stretch" gap={4}>
        {features.map((group) => (
          <Box key={group.category}>
            <Text fontSize="11px" fontWeight="700" color="#475569" mb={1.5}>
              {group.category}
            </Text>
            <VStack align="stretch" gap={1}>
              {group.items.map((item) => (
                <HStack key={item} gap={2} align="start">
                  <Box
                    w="5px"
                    h="5px"
                    borderRadius="50%"
                    bg="#22c55e"
                    mt="5px"
                    flexShrink={0}
                  />
                  <Text fontSize="12px" color="#374151" lineHeight="1.5">
                    {item}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
