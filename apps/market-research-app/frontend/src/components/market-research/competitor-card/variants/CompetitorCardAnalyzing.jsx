import { HStack, Skeleton, Text, VStack } from "@chakra-ui/react";
import { CompetitorLogo } from "../../CompetitorLogo";
import { CompetitorStatusBadge } from "../../CompetitorStatusBadge";

export function CompetitorCardAnalyzing({ competitor }) {
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
        <CompetitorStatusBadge status="analyzing" />
      </HStack>

      <VStack align="start" gap={2} w="full">
        <Skeleton h="10px" w="full" borderRadius="4px" />
        <Skeleton h="10px" w="80%" borderRadius="4px" />
        <Skeleton h="10px" w="60%" borderRadius="4px" />
      </VStack>

      <HStack gap={1.5}>
        <Skeleton h="20px" w="70px" borderRadius="5px" />
        <Skeleton h="20px" w="60px" borderRadius="5px" />
      </HStack>

      <VStack align="start" gap={2.5} w="full" mt="auto" pt={1}>
        <Skeleton h="30px" w="full" borderRadius="5px" />
        <Skeleton h="30px" w="full" borderRadius="5px" />
      </VStack>
    </VStack>
  );
}
