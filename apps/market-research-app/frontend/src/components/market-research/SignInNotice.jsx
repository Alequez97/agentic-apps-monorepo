import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { FileText } from "lucide-react";

export function SignInNotice() {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#e2e8f0"
      p={5}
      boxShadow="0 1px 3px rgba(0,0,0,.05)"
    >
      <HStack gap={2.5} align="start">
        <FileText
          size={20}
          color="#6366f1"
          strokeWidth={2}
          style={{ flexShrink: 0, marginTop: "2px" }}
        />
        <VStack align="start" gap={1} flex="1">
          <Text fontSize="13px" fontWeight="600" color="#0f172a">
            Sign in to save your reports
          </Text>
          <Text fontSize="11px" color="#64748b" lineHeight="1.6">
            Create a free account to keep your research history, revisit past
            analyses, and unlock the full platform — including saved projects,
            cross-report comparisons, and personalised insights.
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}
