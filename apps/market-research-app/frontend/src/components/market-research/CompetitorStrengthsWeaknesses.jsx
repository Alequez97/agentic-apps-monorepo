import { Box, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { CheckCircle, XCircle } from "lucide-react";

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

export function CompetitorStrengthsWeaknesses({ strengths, weaknesses }) {
  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={5}
      >
        <SectionLabel>Strengths</SectionLabel>
        <VStack align="stretch" gap={2}>
          {strengths.map((item) => (
            <HStack key={item} gap={2.5} align="start">
              <Box mt="1px" flexShrink={0}>
                <CheckCircle size={13} color="#16a34a" strokeWidth={2} />
              </Box>
              <Text fontSize="12px" color="#374151" lineHeight="1.55">
                {item}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>

      <Box
        bg="white"
        borderRadius="12px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p={5}
      >
        <SectionLabel>Weaknesses</SectionLabel>
        <VStack align="stretch" gap={2}>
          {weaknesses.map((item) => (
            <HStack key={item} gap={2.5} align="start">
              <Box mt="1px" flexShrink={0}>
                <XCircle size={13} color="#ef4444" strokeWidth={2} />
              </Box>
              <Text fontSize="12px" color="#374151" lineHeight="1.55">
                {item}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>
    </Grid>
  );
}
