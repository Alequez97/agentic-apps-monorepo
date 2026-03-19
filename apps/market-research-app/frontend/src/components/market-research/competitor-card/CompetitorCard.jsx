import { Box } from "@chakra-ui/react";
import { useMarketResearchStore } from "../../../store/useMarketResearchStore";
import { COMPETITOR_STATUS } from "../constants";
import { CompetitorCardAnalyzing } from "./variants/CompetitorCardAnalyzing";
import { CompetitorCardDone } from "./variants/CompetitorCardDone";
import { CompetitorCardFailed } from "./variants/CompetitorCardFailed";
import { CompetitorCardQueued } from "./variants/CompetitorCardQueued";

export function CompetitorCard({ competitor }) {
  const isAnalyzing = competitor.status === COMPETITOR_STATUS.ANALYZING;
  const isDone = competitor.status === COMPETITOR_STATUS.DONE;
  const isFailed = competitor.status === COMPETITOR_STATUS.FAILED;
  const selectCompetitor = useMarketResearchStore((s) => s.selectCompetitor);

  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor={isAnalyzing ? "#bfdbfe" : isDone ? "#e2e8f0" : isFailed ? "#fecaca" : "#f1f5f9"}
      p={4}
      h="100%"
      minH="260px"
      display="flex"
      transition="all 0.2s"
      boxShadow={isAnalyzing ? "0 0 0 3px rgba(59,130,246,.08)" : "none"}
      cursor={isDone ? "pointer" : "default"}
      _hover={
        isDone
          ? {
              borderColor: "#c7d2fe",
              boxShadow: "0 2px 8px rgba(99,102,241,0.08)",
            }
          : {}
      }
      onClick={isDone ? () => selectCompetitor(competitor.id) : undefined}
    >
      {isDone && <CompetitorCardDone competitor={competitor} />}
      {isAnalyzing && <CompetitorCardAnalyzing competitor={competitor} />}
      {isFailed && <CompetitorCardFailed competitor={competitor} />}
      {!isDone && !isAnalyzing && !isFailed && <CompetitorCardQueued competitor={competitor} />}
    </Box>
  );
}
