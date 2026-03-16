import { Badge, Box, HStack, Skeleton, Text, VStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorLogo } from "./CompetitorLogo";
import { CompetitorStatusBadge } from "./CompetitorStatusBadge";

function CompetitorCardDone({ competitor }) {
  return (
    <VStack align="start" gap={3} w="full">
      <HStack justify="space-between" w="full">
        <HStack gap={2}>
          <CompetitorLogo competitor={competitor} />
          <VStack align="start" gap={0}>
            <Text fontSize="13px" fontWeight="700" color="#0f172a">
              {competitor.name}
            </Text>
            <Text fontSize="10px" color="#94a3b8">
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

      <HStack justify="space-between" w="full" pt={1}>
        <VStack align="start" gap={0.5}>
          <Text
            fontSize="9px"
            fontWeight="600"
            color="#94a3b8"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            Pricing
          </Text>
          <Text fontSize="13px" fontWeight="700" color="#16a34a">
            {competitor.pricing}
            <Text
              as="span"
              fontSize="10px"
              fontWeight="400"
              color="#94a3b8"
              ml={0.5}
            >
              {competitor.pricingPeriod}
            </Text>
          </Text>
        </VStack>
        <VStack align="end" gap={0.5}>
          <Text
            fontSize="9px"
            fontWeight="600"
            color="#94a3b8"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            Customers
          </Text>
          <Text fontSize="13px" fontWeight="700" color="#0f172a">
            {competitor.customers}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  );
}

function CompetitorCardAnalyzing({ competitor }) {
  return (
    <VStack align="start" gap={3} w="full">
      <HStack justify="space-between" w="full">
        <HStack gap={2}>
          <CompetitorLogo competitor={competitor} />
          <VStack align="start" gap={0}>
            <Text fontSize="13px" fontWeight="700" color="#0f172a">
              {competitor.name}
            </Text>
            <Text fontSize="10px" color="#94a3b8">
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

      <HStack justify="space-between" w="full" pt={1}>
        <Skeleton h="28px" w="80px" borderRadius="5px" />
        <Skeleton h="28px" w="80px" borderRadius="5px" />
      </HStack>
    </VStack>
  );
}

function CompetitorCardQueued({ competitor }) {
  return (
    <VStack align="start" gap={3} w="full">
      <HStack justify="space-between" w="full">
        <HStack gap={2}>
          <CompetitorLogo competitor={competitor} />
          <VStack align="start" gap={0}>
            <Text fontSize="13px" fontWeight="700" color="#0f172a">
              {competitor.name}
            </Text>
            <Text fontSize="10px" color="#94a3b8">
              {competitor.url}
            </Text>
          </VStack>
        </HStack>
        <CompetitorStatusBadge status="queued" />
      </HStack>

      <VStack align="start" gap={2} w="full">
        <Skeleton h="10px" w="full" borderRadius="4px" />
        <Skeleton h="10px" w="78%" borderRadius="4px" />
        <Skeleton h="10px" w="52%" borderRadius="4px" />
      </VStack>

      <HStack gap={1.5}>
        <Skeleton h="20px" w="66px" borderRadius="5px" />
        <Skeleton h="20px" w="54px" borderRadius="5px" />
      </HStack>

      <HStack justify="space-between" w="full" pt={1}>
        <Skeleton h="28px" w="80px" borderRadius="5px" />
        <Skeleton h="28px" w="80px" borderRadius="5px" />
      </HStack>
    </VStack>
  );
}

export function CompetitorCard({ competitor }) {
  const isAnalyzing = competitor.status === "analyzing";
  const isDone = competitor.status === "done";
  const selectCompetitor = useMarketResearchStore((s) => s.selectCompetitor);

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor={isAnalyzing ? "#bfdbfe" : isDone ? "#e2e8f0" : "#f1f5f9"}
      p={4}
      minH="208px"
      transition="all 0.2s"
      boxShadow={isAnalyzing ? "0 0 0 3px rgba(59,130,246,.08)" : "none"}
      cursor={isDone ? "pointer" : "default"}
      _hover={
        isDone
          ? {
              borderColor: "#c7d2fe",
              boxShadow: "0 2px 8px rgba(99,102,241,0.08)",
            }
          : {}
      }
      onClick={isDone ? () => selectCompetitor(competitor.id) : undefined}
    >
      {isDone && <CompetitorCardDone competitor={competitor} />}
      {isAnalyzing && <CompetitorCardAnalyzing competitor={competitor} />}
      {!isDone && !isAnalyzing && (
        <CompetitorCardQueued competitor={competitor} />
      )}
    </Box>
  );
}
