import {
  Badge,
  Box,
  Container,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertCircle } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { PRICING_PLANS } from "./constants";
import { BillingToggle } from "./BillingToggle";
import { PricingCard } from "./PricingCard";

export function PricingSection() {
  const billingMode = useMarketResearchStore((s) => s.billingMode);
  const plans = PRICING_PLANS[billingMode];

  return (
    <Box bg="white" borderTopWidth="1px" borderColor="#f1f5f9" pt={10} pb={20} px={6}>
      <Container maxW="960px">
        <VStack gap={12} align="stretch">
          <VStack gap={5} textAlign="center">
            <Text
              fontSize="11px"
              fontWeight="700"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="#6366f1"
            >
              PRICING
            </Text>
            <Heading fontSize="30px" fontWeight="800" color="#0f172a" letterSpacing="-0.02em">
              Simple, credit-based pricing
            </Heading>
            <Text fontSize="14px" color="#64748b">
              Each full report costs 2 credits: 1 after competitors are found and 1 after the
              final verdict is generated.
            </Text>
            <HStack gap={1.5} fontSize="12px" color="#94a3b8">
              <AlertCircle size={12} />
              <Text>Credits reset monthly. Unused credits do not roll over.</Text>
            </HStack>
            <BillingToggle />
          </VStack>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            }}
            gap={3.5}
            w="full"
          >
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} isComingSoon={plan.name !== "Free"} />
            ))}
          </Grid>

          <HStack
            bg="#f8fafc"
            borderWidth="1px"
            borderColor="#e2e8f0"
            borderRadius="10px"
            p={4}
            gap={2.5}
            fontSize="12px"
            color="#64748b"
            align="center"
          >
            <Badge
              bg="#fef3c7"
              color="#92400e"
              fontSize="11px"
              fontWeight="700"
              px={2}
              py={0.5}
              borderRadius="5px"
            >
              Top-up
            </Badge>
            <Text>
              Need more credits mid-month? Buy{" "}
              <Text as="span" fontWeight="600" color="#0f172a">
                5 extra credits for $5
              </Text>{" "}
              on any paid plan - no plan change needed.
            </Text>
          </HStack>

          <Text fontSize="12px" color="#94a3b8" textAlign="center">
            All paid plans include a 7-day free trial. Cancel anytime.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
