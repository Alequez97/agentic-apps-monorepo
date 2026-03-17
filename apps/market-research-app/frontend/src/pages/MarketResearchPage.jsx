import { Outlet } from "react-router-dom";
import { MarketResearchNavbar } from "../components/market-research/Navbar";

export default function MarketResearchPage() {
  return (
    <>
      <MarketResearchNavbar />
      <Outlet />
    </>
  );
}
