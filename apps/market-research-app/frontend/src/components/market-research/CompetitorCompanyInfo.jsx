import { Box, Button, Grid, HStack, Text } from "@chakra-ui/react";
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

export function CompetitorCompanyInfo({ details }) {
  const linkEntries = Object.entries(details.links || {});

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
    >
      <SectionLabel>Company info</SectionLabel>

      <Grid templateColumns="repeat(2, 1fr)" rowGap={3} columnGap={4}>
        {[
          { label: "Founded", value: details.founded },
          { label: "Country", value: details.country },
          { label: "Funding", value: details.funding },
          { label: "Employees", value: details.employees },
          { label: "Business model", value: details.business },
          { label: "Target market", value: details.targetMarket },
        ].map(({ label, value }) => (
          <Box key={label}>
            <Text
              fontSize="9px"
              fontWeight="700"
              color="#94a3b8"
              textTransform="uppercase"
              letterSpacing="0.06em"
              mb={0.5}
            >
              {label}
            </Text>
            <Text fontSize="12px" color="#374151">
              {value}
            </Text>
          </Box>
        ))}
      </Grid>

      {linkEntries.length > 0 && (
        <Box mt={4} pt={4} borderTopWidth="1px" borderColor="#f1f5f9">
          <Text
            fontSize="9px"
            fontWeight="700"
            color="#94a3b8"
            textTransform="uppercase"
            letterSpacing="0.06em"
            mb={2.5}
          >
            Links
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {linkEntries.map(([key, url]) => (
              <Button
                key={key}
                as="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                variant="outline"
                fontSize="11px"
                fontWeight="500"
                color="#374151"
                borderColor="#e2e8f0"
                borderRadius="7px"
                h="26px"
                px={2.5}
                _hover={{
                  bg: "#f8fafc",
                  borderColor: "#6366f1",
                  color: "#6366f1",
                }}
                textTransform="capitalize"
              >
                {key}
                <ExternalLink
                  size={10}
                  style={{ marginLeft: "4px", opacity: 0.6 }}
                />
              </Button>
            ))}
          </HStack>
        </Box>
      )}
    </Box>
  );
}
