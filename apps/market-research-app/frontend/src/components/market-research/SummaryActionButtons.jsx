import { Button, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

/**
 * Action buttons shown at the bottom of the summary page.
 */
export function SummaryActionButtons() {
  const resetAnalysis = useMarketResearchStore((s) => s.resetAnalysis);
  const navigate = useNavigate();

  return (
    <VStack justify="center" gap={3} mt={10} w="full" maxW="420px" mx="auto">
      <Button
        variant="outline"
        fontSize="13px"
        fontWeight="600"
        borderColor="#e2e8f0"
        color="#374151"
        borderRadius="9px"
        px={4}
        h="42px"
        w="full"
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
        h="42px"
        w="full"
        _hover={{ bg: "#f1f5f9" }}
        onClick={() => {
          resetAnalysis();
          navigate("/analyze");
        }}
      >
        Run new analysis
      </Button>
    </VStack>
  );
}
