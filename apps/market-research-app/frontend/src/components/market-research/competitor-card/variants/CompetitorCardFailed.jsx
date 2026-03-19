import { HStack, Text, VStack } from "@chakra-ui/react";
import { CompetitorLogo } from "../../CompetitorLogo";
import { CompetitorStatusBadge } from "../../CompetitorStatusBadge";
import { CompetitorMetaRow } from "../CompetitorMetaRow";

export function CompetitorCardFailed({ competitor }) {
  return (
    <VStack align="start" gap={3} w="full" h="full">
      <HStack justify="space-between" w="full" align="start">
        <HStack gap={2} minW={0} align="start">
          <CompetitorLogo competitor={competitor} />
          <VStack align="start" gap={0} minW={0}>
            <Text fontSize="13px" fontWeight="700" color="#0f172a">
              {competitor.name}
            </Text>
            <Text fontSize="10px" color="#94a3b8" noOfLines={1}>
              {competitor.url}
            </Text>
          </VStack>
        </HStack>
        <CompetitorStatusBadge status="failed" />
      </HStack>

      <Text fontSize="11.5px" color="#6b7280" lineHeight="1.55" fontStyle="italic">
        Analysis failed for this competitor. The data could not be retrieved.
      </Text>

      <VStack align="start" gap={2.5} w="full" mt="auto" pt={1} opacity={0.4}>
        <CompetitorMetaRow label="Customers" value="—" />
        <CompetitorMetaRow label="Pricing" value="—" />
      </VStack>
    </VStack>
  );
}
