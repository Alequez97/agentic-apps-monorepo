import { useMarketResearchStore } from "../store/useMarketResearchStore";
import { LandingPage } from "../components/market-research/LandingPage";
import { IdeaInputPage } from "../components/market-research/IdeaInputPage";
import { AnalysisPage } from "../components/market-research/AnalysisPage";
import { AnalysisSummaryPage } from "../components/market-research/AnalysisSummaryPage";
import { ProfilePage } from "../components/market-research/ProfilePage";
import { LoginPage } from "../components/market-research/LoginPage";
import { MarketResearchNavbar } from "../components/market-research/Navbar";

const STEP_VIEWS = {
  landing: LandingPage,
  input: IdeaInputPage,
  analysis: AnalysisPage,
  summary: AnalysisSummaryPage,
  profile: ProfilePage,
  login: LoginPage,
};

export default function MarketResearchPage() {
  const step = useMarketResearchStore((s) => s.step);
  const View = STEP_VIEWS[step] ?? LandingPage;
  return (
    <>
      <MarketResearchNavbar />
      <View />
    </>
  );
}
