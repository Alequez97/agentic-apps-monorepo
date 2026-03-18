import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { FileText } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

export function SignInNotice() {
  const user = useAuthStore((s) => s.user);
  if (user) return null;

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
            Sign in before you run analysis
          </Text>
          <Text fontSize="11px" color="#64748b" lineHeight="1.6">
            Google sign-in is required for every request. New accounts are created on the free plan,
            so each report is tied to a real user instead of an anonymous session.
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}
