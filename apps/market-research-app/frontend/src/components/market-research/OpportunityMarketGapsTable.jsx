import { Box, HStack, Table, Text } from "@chakra-ui/react";

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="800"
      color="#0f172a"
      letterSpacing="-0.01em"
      mb={3}
    >
      {children}
    </Text>
  );
}

export function OpportunityMarketGapsTable({ marketGaps }) {
  if (!marketGaps?.length) {
    return null;
  }

  return (
    <Box
      bg="white"
      borderRadius="14px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={6}
      mb={6}
      overflowX="auto"
    >
      <SectionLabel>Market gaps</SectionLabel>
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader color="#64748b" fontSize="11px" px={0}>
              Gap
            </Table.ColumnHeader>
            <Table.ColumnHeader color="#64748b" fontSize="11px">
              Seen in
            </Table.ColumnHeader>
            <Table.ColumnHeader color="#64748b" fontSize="11px">
              Why it matters
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {marketGaps.map((gap) => (
            <Table.Row key={gap.label}>
              <Table.Cell px={0} py={3} verticalAlign="top">
                <Text fontSize="13px" fontWeight="700" color="#0f172a" mb={1}>
                  {gap.label}
                </Text>
                {gap.examples?.[0] ? (
                  <Text fontSize="12px" color="#64748b" lineHeight="1.55">
                    Example: {gap.examples[0]}
                  </Text>
                ) : null}
              </Table.Cell>
              <Table.Cell py={3} verticalAlign="top">
                <HStack gap={2} align="start">
                  <Text
                    fontSize="12px"
                    fontWeight="800"
                    color="#2563eb"
                    minW="20px"
                  >
                    {gap.competitorCount}
                  </Text>
                  <Text fontSize="12px" color="#475569" lineHeight="1.55">
                    {gap.competitors?.join(", ")}
                  </Text>
                </HStack>
              </Table.Cell>
              <Table.Cell py={3} verticalAlign="top">
                <Text fontSize="12px" color="#334155" lineHeight="1.6">
                  {gap.detail}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
