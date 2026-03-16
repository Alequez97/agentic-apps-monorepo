import { Box, Button, Text, Textarea, VStack } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { RegionSelector } from "./RegionSelector";

export function IdeaInputCard() {
  const user = useAuthStore((s) => s.user);
  const setReturnStep = useAuthStore((s) => s.setReturnStep);
  const idea = useMarketResearchStore((s) => s.idea);
  const setIdea = useMarketResearchStore((s) => s.setIdea);
  const regions = useMarketResearchStore((s) => s.regions);
  const startAnalysis = useMarketResearchStore((s) => s.startAnalysis);
  const setStep = useMarketResearchStore((s) => s.setStep);

  const regionValid = regions === null || regions.length > 0;
  const canSubmit = idea.trim() && regionValid;

  const handleAnalyze = () => {
    if (!user) {
      setReturnStep("input");
      setStep("login");
      return;
    }

    startAnalysis();
  };

  return (
    <Box
      bg="white"
      borderRadius="16px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={8}
      boxShadow="0 1px 3px rgba(0,0,0,.05)"
    >
      <VStack gap={5} align="stretch">
        <VStack align="start" gap={1.5}>
          <Text
            fontSize="11px"
            fontWeight="600"
            color="#64748b"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            Your idea
          </Text>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your business idea..."
            minH="120px"
            fontSize="13px"
            borderColor="#cbd5e1"
            borderRadius="8px"
            _focus={{
              borderColor: "#6366f1",
              boxShadow: "0 0 0 3px rgba(99,102,241,.1)",
            }}
            _placeholder={{ color: "#94a3b8" }}
          />
        </VStack>

        <RegionSelector />

        <Text fontSize="11px" color="#94a3b8">
          Account required - live market intelligence - ~5 min
        </Text>

        <Button
          display="inline-flex"
          alignItems="center"
          gap={2}
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          color="white"
          borderRadius="10px"
          h="42px"
          fontSize="14px"
          fontWeight="600"
          boxShadow="0 2px 8px rgba(99,102,241,.3)"
          transition="all 0.15s"
          _hover={{
            opacity: 0.93,
            boxShadow: "0 4px 12px rgba(99,102,241,.4)",
          }}
          disabled={!canSubmit}
          onClick={handleAnalyze}
          w="full"
          opacity={!canSubmit ? 0.5 : 1}
        >
          <Search size={16} strokeWidth={2.5} />
          {user ? "Analyze Market" : "Sign in to analyze"}
        </Button>
      </VStack>
    </Box>
  );
}
