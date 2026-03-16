import { Box } from "@chakra-ui/react";
import { HeroSection } from "./HeroSection";
import { FeaturePills } from "./FeaturePills";
import { SocialProof } from "./SocialProof";
import { PricingSection } from "./PricingSection";

export function LandingPage() {
  return (
    <Box minH="100vh" bg="#f8fafc">
      <HeroSection />
      <FeaturePills />
      <Box pb={14}>
        <SocialProof />
      </Box>
      <PricingSection />
    </Box>
  );
}
