import { useLocation, useNavigate } from "react-router-dom";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { AppNavbar } from "./AppNavbar";
import { NavAuthControls } from "./NavAuthControls";

/**
 * Step-aware navbar for the market research flow.
 * Composes AppNavbar with NavAuthControls based on the current path.
 * Used once in MarketResearchPage.
 */
export function MarketResearchNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const clearIdea = useMarketResearchStore((s) => s.clearIdea);

  const onLogoClick =
    pathname === "/"
      ? undefined
      : () => {
          clearIdea();
          navigate("/");
        };

  return <AppNavbar onLogoClick={onLogoClick} right={<NavAuthControls />} />;
}
