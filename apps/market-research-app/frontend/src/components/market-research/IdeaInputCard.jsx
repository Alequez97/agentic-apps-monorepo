import { Box, Button, Text, Textarea, VStack } from "@chakra-ui/react";
import { Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { RegionSelector } from "./RegionSelector";

const REJECTION_MESSAGES = {
  TOO_SHORT: "Your idea is too brief to research. Please add more detail.",
  NOT_A_BUSINESS_IDEA:
    "This doesn't look like a business idea. Try describing a product or service.",
  INAPPROPRIATE: "This content isn't suitable for our platform.",
  GIBBERISH: "We couldn't understand your input. Please describe your idea clearly.",
};

export function IdeaInputCard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const creditsRemaining = user?.creditsRemaining ?? 0;
  const idea = useMarketResearchStore((s) => s.idea);
  const setIdea = useMarketResearchStore((s) => s.setIdea);
  const regions = useMarketResearchStore((s) => s.regions);
  const startAnalysis = useMarketResearchStore((s) => s.startAnalysis);
  const isValidating = useMarketResearchStore((s) => s.isValidating);
  const validationError = useMarketResearchStore((s) => s.validationError);
  const analysisError = useMarketResearchStore((s) => s.analysisError);

  const regionValid = regions === null || regions.length > 0;
  const hasEnoughCredits = !user || creditsRemaining >= 2;
  const canSubmit = idea.trim() && regionValid && !isValidating && hasEnoughCredits;

  const handleAnalyze = async () => {
    if (!user) {
      navigate("/login", { state: { returnTo: "/analyze" } });
      return;
    }

    const result = await startAnalysis();
    if (result?.success) {
      navigate("/analysis");
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="16px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={{ base: 5, md: 8 }}
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
            minH={{ base: "100px", md: "120px" }}
            fontSize="13px"
            borderColor={validationError ? "#f87171" : "#cbd5e1"}
            borderRadius="8px"
            disabled={isValidating}
            _focus={{
              borderColor: validationError ? "#f87171" : "#6366f1",
              boxShadow: validationError
                ? "0 0 0 3px rgba(248,113,113,.15)"
                : "0 0 0 3px rgba(99,102,241,.1)",
            }}
            _placeholder={{ color: "#94a3b8" }}
            opacity={isValidating ? 0.6 : 1}
          />
          {validationError && (
            <VStack align="start" gap={1} w="full">
              <Text fontSize="12px" color="#ef4444" fontWeight="500">
                {REJECTION_MESSAGES[validationError.rejectionReason] ??
                  "Please revise your idea and try again."}
              </Text>
              {validationError.suggestedPrompt && (
                <Text fontSize="12px" color="#64748b">
                  Suggestion:{" "}
                  <Box
                    as="span"
                    color="#6366f1"
                    cursor="pointer"
                    fontWeight="500"
                    textDecoration="underline"
                    onClick={() => setIdea(validationError.suggestedPrompt)}
                  >
                    {validationError.suggestedPrompt}
                  </Box>
                </Text>
              )}
            </VStack>
          )}
        </VStack>

        <RegionSelector />

        <Text fontSize="11px" color="#94a3b8">
          Account required - live market intelligence - 2 credits per full report
        </Text>

        {user ? (
          <Text fontSize="12px" color={hasEnoughCredits ? "#475569" : "#dc2626"} fontWeight="500">
            {hasEnoughCredits
              ? `${creditsRemaining} credits remaining`
              : `You need at least 2 credits to start a report. ${creditsRemaining} remaining.`}
          </Text>
        ) : null}

        {analysisError ? (
          <Text fontSize="12px" color="#dc2626" fontWeight="500">
            {analysisError}
          </Text>
        ) : null}

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
          {isValidating ? (
            <>
              <Box
                as={Loader2}
                size={16}
                sx={{
                  "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                  animation: "spin 1s linear infinite",
                }}
              />
              Validating...
            </>
          ) : (
            <>
              <Search size={16} strokeWidth={2.5} />
              {user ? (hasEnoughCredits ? "Analyze Market" : "Need 2 credits") : "Sign in to analyze"}
            </>
          )}
        </Button>
      </VStack>
    </Box>
  );
}
