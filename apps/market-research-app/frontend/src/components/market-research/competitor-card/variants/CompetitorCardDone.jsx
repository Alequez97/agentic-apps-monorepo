import { Badge, HStack, Text, VStack } from "@chakra-ui/react";
import { CompetitorLogo } from "../../CompetitorLogo";
import { CompetitorStatusBadge } from "../../CompetitorStatusBadge";
import { CompetitorMetaRow } from "../CompetitorMetaRow";

export function CompetitorCardDone({ competitor }) {
  return (
    <VStack align="start" gap={3} w="full" h="full">
      <HStack justify="space-between" w="full" align="start">
        <HStack gap={2} minW={0} align="start">
          <CompetitorLogo competitor={competitor} />
          <VStack align="start" gap={0} minW={0}>
            <Text fontSize="13px" fontWeight="700" color="#0f172a" lineHeight="1.35">
              {competitor.name}
            </Text>
            <Text fontSize="10px" color="#94a3b8" noOfLines={1}>
              {competitor.url}
            </Text>
          </VStack>
        </HStack>
        <CompetitorStatusBadge status="done" />
      </HStack>

      <Text fontSize="11.5px" color="#374151" lineHeight="1.55">
        {competitor.description}
      </Text>

      <HStack gap={1.5} flexWrap="wrap">
        {(competitor.tags ?? []).map((tag) => (
          <Badge
            key={tag}
            bg="#f8fafc"
            borderWidth="1px"
            borderColor="#e2e8f0"
            color="#52525b"
            fontSize="10px"
            fontWeight="500"
            px={1.5}
            py={0.5}
            borderRadius="5px"
          >
            {tag}
          </Badge>
        ))}
      </HStack>

      <VStack align="start" gap={2.5} w="full" mt="auto" pt={1}>
        <CompetitorMetaRow label="Customers" value={competitor.customers} />
        <CompetitorMetaRow
          label="Pricing"
          value={competitor.pricing}
          suffix={competitor.pricingPeriod}
          tone="#16a34a"
        />
      </VStack>
    </VStack>
  );
}
