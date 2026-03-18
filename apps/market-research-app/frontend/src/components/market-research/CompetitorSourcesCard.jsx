import { Box, Button, Grid, Text, VStack } from "@chakra-ui/react";
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

function SourceSection({ title, items }) {
  if (!items?.length) {
    return null;
  }

  return (
    <Box minW={0}>
      <Text
        fontSize="10px"
        fontWeight="700"
        color="#64748b"
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={2.5}
      >
        {title}
      </Text>
      <VStack align="stretch" gap={2}>
        {items.map((item, index) => (
          <Box
            key={`${title}-${item.url}-${index}`}
            borderWidth="1px"
            borderColor="#e2e8f0"
            borderRadius="10px"
            p={3}
            bg="#f8fafc"
            minW={0}
            overflow="hidden"
          >
            <Text
              fontSize="12px"
              color="#334155"
              lineHeight="1.55"
              mb={2}
              whiteSpace="normal"
              wordBreak="break-word"
              overflowWrap="anywhere"
            >
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
              h="auto"
              px={2.5}
              py={1.5}
              maxW="100%"
              whiteSpace="normal"
              wordBreak="break-word"
              overflowWrap="anywhere"
              textAlign="left"
              justifyContent="flex-start"
              _hover={{
                bg: "#ffffff",
                borderColor: "#6366f1",
                color: "#6366f1",
              }}
            >
              <Text as="span" minW={0}>
                {item.label}
              </Text>
              <Box as="span" flexShrink={0} ml="4px">
                <ExternalLink size={10} />
              </Box>
            </Button>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}

export function CompetitorSourcesCard({ sources }) {
  const hasSources =
    sources?.pricingEvidence?.length ||
    sources?.companyEvidence?.length ||
    sources?.reviewEvidence?.length ||
    sources?.featureEvidence?.length;

  if (!hasSources) {
    return null;
  }

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
      minW={0}
      overflow="hidden"
    >
      <SectionLabel>Evidence & sources</SectionLabel>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
        <SourceSection title="Pricing" items={sources.pricingEvidence} />
        <SourceSection title="Company" items={sources.companyEvidence} />
        <SourceSection title="Reviews" items={sources.reviewEvidence} />
        <SourceSection title="Features" items={sources.featureEvidence} />
      </Grid>
    </Box>
  );
}
