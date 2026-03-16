import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { IdeaInputCard } from "./IdeaInputCard";
import { SignInNotice } from "./SignInNotice";
import { InputStatsFooter } from "./InputStatsFooter";

export function IdeaInputPage() {
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);
  const goToInput = useMarketResearchStore((s) => s.goToInput);

  return (
    <Box minH="100vh" bg="#f8fafc">
      <Container maxW="680px" py={16} pt="80px">
        <VStack gap={8} align="stretch">
          {/* Page header */}
          <VStack gap={3} textAlign="center">
            <Heading
              fontSize="36px"
              fontWeight="800"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              What&apos;s your{" "}
              <Box
                as="span"
                bg="linear-gradient(135deg, #6366f1, #a855f7)"
                bgClip="text"
                css={{ WebkitTextFillColor: "transparent" }}
              >
                idea?
              </Box>
            </Heading>
            <Text fontSize="14px" color="#64748b">
              Describe it below — we&apos;ll find competitors, map gaps, and
              give you a verdict.
            </Text>
          </VStack>

          <IdeaInputCard />
          <SignInNotice />
          <InputStatsFooter />
        </VStack>
      </Container>
    </Box>
  );
}
