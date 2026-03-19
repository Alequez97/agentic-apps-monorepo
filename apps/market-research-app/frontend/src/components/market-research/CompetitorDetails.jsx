import { Badge, Box, Button, Grid, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { useEffect } from "react";
import { AlertCircle, ArrowLeft, ExternalLink, RotateCw } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorLogo } from "./CompetitorLogo";
import { CompetitorFeaturesCard } from "./CompetitorFeaturesCard";
import { CompetitorMissingFeaturesCard } from "./CompetitorMissingFeaturesCard";
import { CompetitorPricingPlans } from "./CompetitorPricingPlans";
import { CompetitorStrengthsWeaknesses } from "./CompetitorStrengthsWeaknesses";
import { CompetitorCompanyInfo } from "./CompetitorCompanyInfo";
import { CompetitorSourcesCard } from "./CompetitorSourcesCard";
import { COMPETITOR_STATUS } from "./constants";

function StatCard({ label, value }) {
  return (
    <Box bg="#f8fafc" borderRadius="10px" borderWidth="1px" borderColor="#f1f5f9" px={3.5} py={3}>
      <Text
        fontSize="9px"
        fontWeight="700"
        color="#94a3b8"
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={1}
      >
        {label}
      </Text>
      <Text fontSize="13px" fontWeight="700" color="#0f172a" lineHeight="1.3">
        {value}
      </Text>
    </Box>
  );
}

function normalizeUrl(url) {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}

export function CompetitorDetails({ competitor, onBack }) {
  const loadCompetitorDetails = useMarketResearchStore((s) => s.loadCompetitorDetails);
  const retryCompetitor = useMarketResearchStore((s) => s.retryCompetitor);
  const retryingCompetitorIds = useMarketResearchStore((s) => s.retryingCompetitorIds);
  const { details } = competitor;

  const isRetrying = retryingCompetitorIds.has(competitor.id);

  useEffect(() => {
    if (!details && !competitor.loadFailed && competitor.status !== COMPETITOR_STATUS.ANALYZING) {
      loadCompetitorDetails(competitor.id);
    }
  }, [competitor.id, details, competitor.loadFailed, competitor.status, loadCompetitorDetails]);

  const handleRetry = async () => {
    await retryCompetitor(competitor.id);
    // Store updates status to "analyzing", which triggers loading UI
  };

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      alignSelf="start"
      fontSize="12px"
      fontWeight="600"
      color="#64748b"
      px={2}
      h="30px"
      _hover={{ bg: "#f1f5f9", color: "#0f172a" }}
      onClick={onBack}
    >
      <ArrowLeft size={13} style={{ marginRight: "6px" }} />
      Competitors
    </Button>
  );

  if (competitor.loadFailed) {
    return (
      <VStack align="stretch" gap={5}>
        {backButton}
        <Box
          bg="white"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="#fecaca"
          p={8}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={3}
          textAlign="center"
        >
          <AlertCircle size={28} color="#ef4444" />
          <Text fontSize="14px" fontWeight="700" color="#0f172a">
            Analysis incomplete for {competitor.name}
          </Text>
          <Text fontSize="13px" color="#64748b" maxW="420px" mb={2}>
            The detailed research for this competitor did not complete successfully. You can restart
            the analysis at no extra charge.
          </Text>
          <Button
            size="sm"
            colorScheme="blue"
            fontSize="12px"
            fontWeight="600"
            px={4}
            h="32px"
            isLoading={isRetrying}
            loadingText="Restarting..."
            onClick={handleRetry}
            leftIcon={<RotateCw size={14} />}
          >
            Retry Analysis
          </Button>
        </Box>
      </VStack>
    );
  }

  if (!details) {
    return (
      <VStack align="stretch" gap={5}>
        {backButton}
        <Box
          bg="white"
          borderRadius="12px"
          borderWidth="1px"
          borderColor="#e2e8f0"
          p={8}
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={3}
        >
          <Spinner size="sm" color="#6366f1" />
          <Text fontSize="13px" color="#64748b">
            {competitor.status === COMPETITOR_STATUS.ANALYZING
              ? `Analyzing ${competitor.name}…`
              : `Loading ${competitor.name} profile…`}
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={5}>
      {backButton}

      {/* Header card */}
      <Box bg="white" borderRadius="12px" borderWidth="1px" borderColor="#e2e8f0" p={5}>
        <HStack justify="space-between" align="start" mb={4}>
          <HStack gap={3}>
            <CompetitorLogo competitor={competitor} size={44} />
            <VStack align="start" gap={0.5}>
              <HStack gap={2}>
                <Text fontSize="20px" fontWeight="800" color="#0f172a" letterSpacing="-0.025em">
                  {competitor.name}
                </Text>
                <Badge
                  bg="#dcfce7"
                  color="#15803d"
                  fontSize="10px"
                  fontWeight="600"
                  px={2}
                  py={0.5}
                  borderRadius="9999px"
                >
                  ✓ Done
                </Badge>
              </HStack>
              <Text
                as="a"
                href={normalizeUrl(competitor.url)}
                target="_blank"
                rel="noopener noreferrer"
                fontSize="12px"
                color="#94a3b8"
                _hover={{ color: "#6366f1", textDecoration: "underline" }}
              >
                {competitor.url}
              </Text>
            </VStack>
          </HStack>

          <Button
            as="a"
            href={normalizeUrl(competitor.url)}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="outline"
            fontSize="12px"
            fontWeight="600"
            borderColor="#e2e8f0"
            color="#374151"
            borderRadius="8px"
            h="32px"
            px={3}
            _hover={{ bg: "#f8fafc", borderColor: "#cbd5e1" }}
          >
            Visit site
            <ExternalLink size={12} style={{ marginLeft: "5px" }} />
          </Button>
        </HStack>

        <Text fontSize="13px" color="#374151" lineHeight="1.65" mb={4}>
          {competitor.description}
        </Text>

        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={3} mb={4}>
          <StatCard label="Customers" value={competitor.customers} />
          <StatCard label="Founded" value={details.founded} />
          <StatCard label="Country" value={details.country} />
          <StatCard label="Funding" value={details.funding} />
        </Grid>

        <HStack gap={1.5} flexWrap="wrap">
          {(competitor.tags ?? []).map((tag) => (
            <Badge
              key={tag}
              bg="#f8fafc"
              borderWidth="1px"
              borderColor="#e2e8f0"
              color="#52525b"
              fontSize="10px"
              fontWeight="500"
              px={2}
              py={0.5}
              borderRadius="6px"
            >
              {tag}
            </Badge>
          ))}
        </HStack>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
        <CompetitorFeaturesCard features={details.features} />
        <CompetitorMissingFeaturesCard missingFeatures={details.missingFeatures} />
      </Grid>

      <CompetitorPricingPlans
        pricingPlans={details.pricingPlans}
        pricingEvidence={details.sources?.pricingEvidence}
      />

      <CompetitorStrengthsWeaknesses
        strengths={details.strengths}
        weaknesses={details.weaknesses}
      />

      <CompetitorSourcesCard sources={details.sources} />

      <CompetitorCompanyInfo details={details} competitor={competitor} />
    </VStack>
  );
}
