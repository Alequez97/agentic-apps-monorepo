import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { CheckCircle } from "lucide-react";

const VERDICT_STYLES = {
  "worth-entering": {
    borderColor: "#86efac",
    iconColor: "#16a34a",
    labelColor: "#15803d",
    label: "Worth entering this market",
  },
  risky: {
    borderColor: "#fcd34d",
    iconColor: "#d97706",
    labelColor: "#92400e",
    label: "Risky - proceed with caution",
  },
  crowded: {
    borderColor: "#fca5a5",
    iconColor: "#dc2626",
    labelColor: "#991b1b",
    label: "Crowded market - tough entry",
  },
};

export function OpportunityCard({
  opportunity,
  competitorCount,
  onStartBuilding,
}) {
  const verdict = opportunity?.verdict ?? "worth-entering";
  const styles = VERDICT_STYLES[verdict] ?? VERDICT_STYLES["worth-entering"];
  const differentiators = opportunity?.differentiators ?? [];
  const risks = opportunity?.risks ?? [];
  const summary = opportunity?.summary ?? "";
  const confidence = opportunity?.confidence ?? "high";

  return (
    <Box
      bg="white"
      borderWidth="1.5px"
      borderColor={styles.borderColor}
      borderRadius="14px"
      p={6}
      mb={6}
    >
      <HStack gap={3} mb={4} align="start">
        <Box color={styles.iconColor} flexShrink={0} mt="1px">
          <CheckCircle size={22} strokeWidth={2.5} />
        </Box>
        <Box>
          <Text
            fontSize="16px"
            fontWeight="800"
            color={styles.labelColor}
            mb={0.5}
          >
            {styles.label}
          </Text>
          <Text fontSize="12px" color="#64748b" fontWeight="500">
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)}{" "}
            confidence - Based on {competitorCount ?? 0} competitor{" "}
            {(competitorCount ?? 0) === 1 ? "analysis" : "analyses"}
          </Text>
        </Box>
      </HStack>

      {summary ? (
        <Box mb={4} pl={9}>
          <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={1}>
            Market opportunity identified:
          </Text>
          <Text fontSize="13px" color="#374151" lineHeight="1.65">
            {summary}
          </Text>
        </Box>
      ) : null}

      {differentiators.length > 0 ? (
        <Box pl={9}>
          <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={2.5}>
            Key differentiators to pursue:
          </Text>
          <VStack align="start" gap={2}>
            {differentiators.map((item) => (
              <HStack key={item.label} align="start" gap={2.5}>
                <Text
                  fontSize="13px"
                  color="#16a34a"
                  fontWeight="700"
                  flexShrink={0}
                  mt="1px"
                >
                  +
                </Text>
                <Text fontSize="13px" color="#374151" lineHeight="1.55">
                  <Text as="span" fontWeight="700" color="#0f172a">
                    {item.label}
                  </Text>{" "}
                  -{" "}
                  <Text as="span" color="#4b5563">
                    {item.detail}
                  </Text>
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      ) : null}

      {risks.length > 0 ? (
        <Box pl={9} mt={differentiators.length > 0 ? 5 : 0}>
          <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={2.5}>
            Risks to watch:
          </Text>
          <VStack align="start" gap={2}>
            {risks.map((item) => (
              <HStack key={item.label} align="start" gap={2.5}>
                <Text
                  fontSize="13px"
                  color="#d97706"
                  fontWeight="700"
                  flexShrink={0}
                  mt="1px"
                >
                  !
                </Text>
                <Text fontSize="13px" color="#374151" lineHeight="1.55">
                  <Text as="span" fontWeight="700" color="#0f172a">
                    {item.label}
                  </Text>{" "}
                  -{" "}
                  <Text as="span" color="#4b5563">
                    {item.detail}
                  </Text>
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      ) : null}

      <Box mt={5}>
        <Button
          w="full"
          h="46px"
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          color="white"
          fontSize="14px"
          fontWeight="700"
          borderRadius="10px"
          _hover={{ opacity: 0.9 }}
          onClick={onStartBuilding}
        >
          Start building -&gt;
        </Button>
      </Box>
    </Box>
  );
}
