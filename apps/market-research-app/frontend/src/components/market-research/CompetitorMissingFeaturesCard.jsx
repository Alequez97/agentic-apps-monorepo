import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { XCircle } from "lucide-react";

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

export function CompetitorMissingFeaturesCard({ missingFeatures }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>What's missing</SectionLabel>
      <VStack align="stretch" gap={1.5}>
        {missingFeatures.map((item) => (
          <HStack key={item} gap={2} align="start">
            <Box mt="1px" flexShrink={0}>
              <XCircle size={13} color="#f87171" strokeWidth={2} />
            </Box>
            <Text fontSize="12px" color="#374151" lineHeight="1.5">
              {item}
            </Text>
          </HStack>
        ))}
      </VStack>

      <Box mt={4} pt={4} borderTopWidth="1px" borderColor="#f1f5f9">
        <Text fontSize="11px" color="#94a3b8" fontStyle="italic">
          These gaps represent potential differentiation opportunities.
        </Text>
      </Box>
    </Box>
  );
}
