import { useLocationStore } from "../../store/useLocationStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { AppNavbar } from "./AppNavbar";
import { NavAuthControls } from "./NavAuthControls";

/**
 * Step-aware navbar for the market research flow.
 * Composes AppNavbar with NavAuthControls based on the current step.
 * Used once in MarketResearchPage.
 */
export function MarketResearchNavbar() {
  const step = useLocationStore((s) => s.step);
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);

  const onLogoClick = step === "landing" ? undefined : goToLanding;

  return <AppNavbar onLogoClick={onLogoClick} right={<NavAuthControls />} />;
}
