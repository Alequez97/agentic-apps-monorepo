import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * Shown on the summary page for anonymous users only.
 * Prompts them to sign in to save the report to their account.
 */
export function SaveReportBanner() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (user) return null;

  const handleSignIn = () => {
    navigate("/login", { state: { returnTo: pathname } });
  };

  return (
    <Box
      mb={6}
      p={4}
      bg="linear-gradient(135deg, #eef2ff, #f5f3ff)"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="#c7d2fe"
    >
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Text fontSize="13px" fontWeight="600" color="#3730a3">
            Save this report to your account
          </Text>
          <Text fontSize="12px" color="#6366f1">
            Sign in to access it from any device, anytime.
          </Text>
        </Box>
        <Button
          fontSize="12px"
          fontWeight="700"
          bg="#6366f1"
          color="white"
          borderRadius="8px"
          px={4}
          h="34px"
          _hover={{ bg: "#4f46e5" }}
          flexShrink={0}
          onClick={handleSignIn}
        >
          Sign in to save
        </Button>
      </HStack>
    </Box>
  );
}
