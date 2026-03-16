import { Button, HStack } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

/**
 * Action buttons shown at the bottom of the summary page.
 */
export function SummaryActionButtons() {
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);

  return (
    <HStack justify="center" gap={3} flexWrap="wrap" mt={10}>
      <Button
        variant="outline"
        fontSize="13px"
        fontWeight="600"
        borderColor="#e2e8f0"
        color="#374151"
        borderRadius="9px"
        px={4}
        h="38px"
        _hover={{ bg: "#f1f5f9" }}
      >
        Export full report
      </Button>
      <Button
        variant="outline"
        fontSize="13px"
        fontWeight="600"
        borderColor="#e2e8f0"
        color="#374151"
        borderRadius="9px"
        px={4}
        h="38px"
        _hover={{ bg: "#f1f5f9" }}
        onClick={resetAnalysis}
      >
        Run new analysis
      </Button>
    </HStack>
  );
}
