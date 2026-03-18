import { Badge, Box, Button, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { ExternalLink } from "lucide-react";

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

export function CompetitorPricingPlans({ pricingPlans, pricingEvidence }) {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>Pricing plans</SectionLabel>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: `repeat(${Math.min(pricingPlans.length, 2)}, 1fr)`,
          md: `repeat(${Math.min(pricingPlans.length, 4)}, 1fr)`,
        }}
        gap={3}
      >
        {pricingPlans.map((plan) => (
          <Box
            key={plan.name}
            borderRadius="10px"
            borderWidth={plan.highlight ? "2px" : "1px"}
            borderColor={plan.highlight ? "#6366f1" : "#e2e8f0"}
            bg={plan.highlight ? "#fafafe" : "#f8fafc"}
            p={3.5}
            position="relative"
          >
            {plan.highlight && (
              <Badge
                position="absolute"
                top="-10px"
                left="50%"
                transform="translateX(-50%)"
                bg="#6366f1"
                color="white"
                fontSize="9px"
                fontWeight="700"
                px={2}
                py={0.5}
                borderRadius="9999px"
                whiteSpace="nowrap"
              >
                Most popular
              </Badge>
            )}
            <Text
              fontSize="11px"
              fontWeight="700"
              color={plan.highlight ? "#6366f1" : "#374151"}
              mb={1.5}
            >
              {plan.name}
            </Text>
            <HStack gap={0} align="baseline" mb={1.5}>
              <Text
                fontSize="18px"
                fontWeight="800"
                color="#0f172a"
                lineHeight="1"
              >
                {plan.price}
              </Text>
              {plan.period && (
                <Text fontSize="10px" color="#94a3b8" ml={0.5}>
                  {plan.period}
                </Text>
              )}
            </HStack>
            <Text fontSize="11px" color="#64748b" lineHeight="1.5">
              {plan.note}
            </Text>
          </Box>
        ))}
      </Grid>

      {pricingEvidence?.length > 0 && (
        <Box mt={4} pt={4} borderTopWidth="1px" borderColor="#f1f5f9">
          <Text
            fontSize="10px"
            fontWeight="700"
            color="#64748b"
            textTransform="uppercase"
            letterSpacing="0.06em"
            mb={2.5}
          >
            Pricing evidence
          </Text>
          <VStack align="stretch" gap={2}>
            {pricingEvidence.map((item, index) => (
              <HStack
                key={`${item.url}-${index}`}
                justify="space-between"
                align="start"
                gap={3}
                borderWidth="1px"
                borderColor="#e2e8f0"
                borderRadius="9px"
                p={3}
                bg="#f8fafc"
                flexDir={{ base: "column", md: "row" }}
              >
                <Text fontSize="12px" color="#334155" lineHeight="1.55" flex="1">
                  {item.claim}
                </Text>
                <Button
                  as="a"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  variant="outline"
                  fontSize="11px"
                  fontWeight="600"
                  color="#374151"
                  borderColor="#dbe4ee"
                  borderRadius="7px"
                  h="26px"
                  px={2.5}
                  flexShrink={0}
                  alignSelf={{ base: "stretch", md: "flex-start" }}
                  _hover={{
                    bg: "#ffffff",
                    borderColor: "#6366f1",
                    color: "#6366f1",
                  }}
                >
                  <Box as="span" display={{ base: "none", md: "inline" }}>
                    {item.label}
                  </Box>
                  <Box as="span" display={{ base: "inline", md: "none" }}>
                    Source
                  </Box>
                  <ExternalLink size={10} style={{ marginLeft: "4px" }} />
                </Button>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
