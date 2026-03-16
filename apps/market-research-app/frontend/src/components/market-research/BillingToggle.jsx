import { Badge, Button, HStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

export function BillingToggle() {
  const billingMode = useMarketResearchStore((s) => s.billingMode);
  const setBillingMode = useMarketResearchStore((s) => s.setBillingMode);

  return (
    <HStack gap={0.5} bg="#f1f5f9" borderRadius="8px" p="3px" mt={5}>
      <Button
        onClick={() => setBillingMode("monthly")}
        bg={billingMode === "monthly" ? "white" : "transparent"}
        color={billingMode === "monthly" ? "#0f172a" : "#64748b"}
        fontSize="12px"
        fontWeight={billingMode === "monthly" ? "600" : "500"}
        borderRadius="6px"
        px={3.5}
        h="28px"
        boxShadow={
          billingMode === "monthly" ? "0 1px 3px rgba(0,0,0,.1)" : "none"
        }
        _hover={{ color: "#0f172a" }}
      >
        Monthly
      </Button>
      <Button
        onClick={() => setBillingMode("annual")}
        bg={billingMode === "annual" ? "white" : "transparent"}
        color={billingMode === "annual" ? "#0f172a" : "#64748b"}
        fontSize="12px"
        fontWeight={billingMode === "annual" ? "600" : "500"}
        borderRadius="6px"
        px={3.5}
        h="28px"
        boxShadow={
          billingMode === "annual" ? "0 1px 3px rgba(0,0,0,.1)" : "none"
        }
        _hover={{ color: "#0f172a" }}
        display="inline-flex"
        alignItems="center"
        gap={1.5}
      >
        Annual
        <Badge
          bg="#dcfce7"
          color="#15803d"
          fontSize="10px"
          fontWeight="700"
          px={1.5}
          py={0.5}
          borderRadius="9999px"
        >
          Save 20%
        </Badge>
      </Button>
    </HStack>
  );
}
