import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";

const TABLE_COLUMNS = [
  { key: "competitor", label: "Competitor", flex: 2.2 },
  { key: "pricing", label: "Pricing", flex: 1.2 },
  { key: "customers", label: "Users", flex: 1 },
  { key: "tags", label: "Tags", flex: 2 },
];

function CompetitorTableRow({ competitor, onClick }) {
  return (
    <HStack
      px={4}
      py={3}
      borderBottomWidth="1px"
      borderColor="#f1f5f9"
      _last={{ borderBottomWidth: 0 }}
      gap={0}
      cursor="pointer"
      onClick={onClick}
      _hover={{ bg: "#f1f5f9" }}
      display={{ base: "none", md: "flex" }}
    >
      <HStack gap={2.5} flex={TABLE_COLUMNS[0].flex} minW={0}>
        <Box
          w="28px"
          h="28px"
          borderRadius="7px"
          bg={competitor.logoBg}
          color={competitor.logoColor}
          fontWeight="800"
          fontSize="9px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {competitor.logoChar}
        </Box>
        <Text fontSize="13px" fontWeight="600" color="#0f172a" noOfLines={1}>
          {competitor.name}
        </Text>
      </HStack>

      <Box flex={TABLE_COLUMNS[1].flex}>
        <Text fontSize="12px" fontWeight="600" color="#374151">
          {competitor.pricing}
          {competitor.pricingPeriod}
        </Text>
      </Box>

      <Box flex={TABLE_COLUMNS[2].flex}>
        <Text fontSize="12px" fontWeight="600" color="#374151">
          {competitor.customers}
        </Text>
      </Box>

      <HStack flex={TABLE_COLUMNS[3].flex} gap={1} flexWrap="wrap">
        {(competitor.tags ?? []).slice(0, 3).map((tag) => (
          <Box
            key={tag}
            px={2}
            py={0.5}
            borderRadius="5px"
            fontSize="10px"
            fontWeight="600"
            bg="#f1f5f9"
            color="#475569"
          >
            {tag}
          </Box>
        ))}
      </HStack>
    </HStack>
  );
}

function MobileCompetitorCard({ competitor, onClick }) {
  return (
    <Box
      p={4}
      borderBottomWidth="1px"
      borderColor="#f1f5f9"
      _last={{ borderBottomWidth: 0 }}
      cursor="pointer"
      onClick={onClick}
      display={{ base: "block", md: "none" }}
    >
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between" align="start" gap={3}>
          <HStack gap={2.5} minW={0} flex="1">
            <Box
              w="32px"
              h="32px"
              borderRadius="8px"
              bg={competitor.logoBg}
              color={competitor.logoColor}
              fontWeight="800"
              fontSize="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              {competitor.logoChar}
            </Box>
            <Text fontSize="14px" fontWeight="700" color="#0f172a" lineHeight="1.3">
              {competitor.name}
            </Text>
          </HStack>

          <Badge bg="#eef2ff" color="#4f46e5" borderRadius="9999px" px={2} py={0.5}>
            Details
          </Badge>
        </HStack>

        <HStack gap={3} align="stretch">
          <Box
            flex="1"
            bg="#f8fafc"
            borderWidth="1px"
            borderColor="#e2e8f0"
            borderRadius="10px"
            p={3}
          >
            <Text fontSize="9px" fontWeight="700" color="#94a3b8" textTransform="uppercase" mb={1}>
              Pricing
            </Text>
            <Text fontSize="13px" fontWeight="700" color="#374151">
              {competitor.pricing}
              {competitor.pricingPeriod}
            </Text>
          </Box>

          <Box
            flex="1"
            bg="#f8fafc"
            borderWidth="1px"
            borderColor="#e2e8f0"
            borderRadius="10px"
            p={3}
          >
            <Text fontSize="9px" fontWeight="700" color="#94a3b8" textTransform="uppercase" mb={1}>
              Users
            </Text>
            <Text fontSize="13px" fontWeight="700" color="#374151">
              {competitor.customers}
            </Text>
          </Box>
        </HStack>

        <HStack gap={1.5} flexWrap="wrap">
          {(competitor.tags ?? []).slice(0, 4).map((tag) => (
            <Box
              key={tag}
              px={2}
              py={1}
              borderRadius="7px"
              fontSize="11px"
              fontWeight="600"
              bg="#f1f5f9"
              color="#475569"
            >
              {tag}
            </Box>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
}

export function CompetitorComparisonTable({ competitors, onSelectCompetitor }) {
  return (
    <Box>
      <Text fontSize="15px" fontWeight="700" color="#0f172a" mb={3}>
        Competitive Landscape - Full Comparison
      </Text>
      <Box
        borderWidth="1px"
        borderColor="#e2e8f0"
        borderRadius="12px"
        overflow="hidden"
        bg="white"
      >
        <Box display={{ base: "block", md: "none" }}>
          {competitors.map((c) => (
            <MobileCompetitorCard
              key={c.id}
              competitor={c}
              onClick={() => onSelectCompetitor(c.id)}
            />
          ))}
        </Box>

        <HStack
          px={4}
          py={2.5}
          bg="#f8fafc"
          borderBottomWidth="1px"
          borderColor="#e2e8f0"
          gap={0}
          display={{ base: "none", md: "flex" }}
        >
          {TABLE_COLUMNS.map((col) => (
            <Text
              key={col.key}
              flex={col.flex}
              fontSize="10px"
              fontWeight="700"
              color="#94a3b8"
              textTransform="uppercase"
              letterSpacing="0.07em"
            >
              {col.label}
            </Text>
          ))}
        </HStack>

        {competitors.map((c) => (
          <CompetitorTableRow
            key={c.id}
            competitor={c}
            onClick={() => onSelectCompetitor(c.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
