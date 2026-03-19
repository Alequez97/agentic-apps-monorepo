import { Text, VStack } from "@chakra-ui/react";

export function CompetitorMetaRow({ label, value, tone = "#0f172a", suffix = null }) {
  return (
    <VStack align="start" gap={0.5} w="full">
      <Text
        fontSize="9px"
        fontWeight="600"
        color="#94a3b8"
        textTransform="uppercase"
        letterSpacing="0.05em"
      >
        {label}
      </Text>
      <Text fontSize="13px" fontWeight="700" color={tone} lineHeight="1.45" whiteSpace="normal">
        {value}
        {suffix ? (
          <Text as="span" fontSize="10px" fontWeight="400" color="#94a3b8" ml={0.5}>
            {suffix}
          </Text>
        ) : null}
      </Text>
    </VStack>
  );
}
