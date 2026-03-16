import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { CompetitorDetails } from "./CompetitorDetails";
import { SummaryHeroBanner } from "./SummaryHeroBanner";
import { StartBuildingModal } from "./StartBuildingModal";
import { OpportunityCard } from "./OpportunityCard";
import { CompetitorComparisonTable } from "./CompetitorComparisonTable";
import { OpportunityMarketGapsTable } from "./OpportunityMarketGapsTable";
import { SaveReportBanner } from "./SaveReportBanner";
import { SummaryActionButtons } from "./SummaryActionButtons";

export function AnalysisSummaryPage() {
  const idea = useMarketResearchStore((s) => s.idea);
  const competitors = useMarketResearchStore((s) => s.competitors);
  const report = useMarketResearchStore((s) => s.report);
  const selectedCompetitorId = useMarketResearchStore(
    (s) => s.selectedCompetitorId,
  );
  const selectCompetitor = useMarketResearchStore((s) => s.selectCompetitor);
  const clearSelectedCompetitor = useMarketResearchStore(
    (s) => s.clearSelectedCompetitor,
  );

  const [buildingModalOpen, setBuildingModalOpen] = useState(false);

  const selectedCompetitor =
    competitors.find((c) => c.id === selectedCompetitorId) ?? null;

  if (selectedCompetitor) {
    return (
      <Box minH="100vh" bg="#f8fafc">
        <Box maxW="1040px" mx="auto" px={6} pt="72px" pb={16}>
          <CompetitorDetails
            competitor={selectedCompetitor}
            onBack={clearSelectedCompetitor}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Box maxW="1040px" mx="auto" px={6} pt="72px" pb={16}>
        <SummaryHeroBanner idea={idea} competitorCount={competitors.length} />

        <SaveReportBanner />

        <OpportunityCard
          opportunity={report?.opportunity}
          competitorCount={competitors.length}
          onStartBuilding={() => setBuildingModalOpen(true)}
        />

        <OpportunityMarketGapsTable
          marketGaps={report?.opportunity?.marketGaps}
        />

        <CompetitorComparisonTable
          competitors={competitors}
          onSelectCompetitor={selectCompetitor}
        />

        <SummaryActionButtons />

        <StartBuildingModal
          open={buildingModalOpen}
          onClose={() => setBuildingModalOpen(false)}
        />
      </Box>
    </Box>
  );
}
