import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Code2, GitBranch, Wrench, Zap } from "lucide-react";

const PLATFORM_FEATURES = [
  {
    icon: Code2,
    title: "AI Codebase Analyzer",
    description:
      "Deep static analysis powered by Claude — finds logic bugs, security issues, and dead code across your entire repo.",
  },
  {
    icon: Zap,
    title: "Auto-Fix Engine",
    description:
      "One-click AI fixes with full context. No copy-pasting from ChatGPT — changes land directly in your codebase.",
  },
  {
    icon: GitBranch,
    title: "PR-level Review",
    description:
      "Every pull request gets an AI reviewer that understands your architecture and flags real problems, not noise.",
  },
  {
    icon: Wrench,
    title: "Ongoing Maintenance",
    description:
      "Continuous refactor suggestions, dependency upgrades, and tech-debt tracking — your codebase stays healthy automatically.",
  },
];

export function StartBuildingModal({ open, onClose }) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => !open && onClose()}
      size="lg"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="20px" overflow="hidden" mx={4}>
            {/* Header */}
            <Box
              bg="linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)"
              px={7}
              py={6}
            >
              <HStack justify="space-between" align="start">
                <Box>
                  <Text
                    fontSize="22px"
                    fontWeight="800"
                    color="white"
                    letterSpacing="-0.02em"
                    mb={1}
                  >
                    Build it with JFS
                  </Text>
                  <Text
                    fontSize="13px"
                    color="rgba(255,255,255,0.75)"
                    fontWeight="500"
                  >
                    The AI platform that builds, maintains, and analyzes your
                    code
                  </Text>
                </Box>
                <CloseButton
                  size="sm"
                  color="white"
                  opacity={0.7}
                  _hover={{ opacity: 1, bg: "whiteAlpha.200" }}
                  onClick={onClose}
                />
              </HStack>
            </Box>

            {/* Body */}
            <Dialog.Body px={7} py={6} bg="white">
              <Text fontSize="13px" color="#64748b" mb={5} lineHeight="1.6">
                Your market research shows a clear gap. JFS gives you the exact
                AI-powered tools to fill it — from day one to production.
              </Text>

              <VStack gap={4} align="stretch">
                {PLATFORM_FEATURES.map(({ icon: Icon, title, description }) => (
                  <HStack key={title} gap={4} align="start">
                    <Box
                      w="38px"
                      h="38px"
                      borderRadius="10px"
                      bg="linear-gradient(135deg, #ede9fe, #ddd6fe)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                      color="#7c3aed"
                    >
                      <Icon size={17} strokeWidth={2} />
                    </Box>
                    <Box>
                      <Text
                        fontSize="13px"
                        fontWeight="700"
                        color="#0f172a"
                        mb={0.5}
                      >
                        {title}
                      </Text>
                      <Text fontSize="12px" color="#64748b" lineHeight="1.55">
                        {description}
                      </Text>
                    </Box>
                  </HStack>
                ))}
              </VStack>
            </Dialog.Body>

            {/* Footer */}
            <Box
              px={7}
              py={5}
              borderTopWidth="1px"
              borderColor="#f1f5f9"
              bg="white"
            >
              <Button
                w="full"
                h="44px"
                bg="linear-gradient(135deg, #6366f1, #7c3aed)"
                color="white"
                fontSize="14px"
                fontWeight="700"
                borderRadius="11px"
                _hover={{ opacity: 0.9 }}
                mb={2.5}
              >
                Get early access →
              </Button>
              <Text textAlign="center" fontSize="11px" color="#94a3b8">
                Free to start · No credit card required
              </Text>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
