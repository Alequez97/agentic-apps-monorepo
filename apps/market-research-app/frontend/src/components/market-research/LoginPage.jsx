import { Box, Button, Text, VStack, HStack } from "@chakra-ui/react";
import { GoogleLogin } from "@react-oauth/google";
import { ArrowLeft, Search } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { toaster } from "../ui/toaster";

export function LoginPage() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const claimSession = useAuthStore((s) => s.claimSession);
  const returnStep = useAuthStore((s) => s.returnStep);
  const setReturnStep = useAuthStore((s) => s.setReturnStep);

  const setStep = useMarketResearchStore((s) => s.setStep);
  const sessionId = useMarketResearchStore((s) => s.sessionId);

  const handleBack = () => {
    setStep(returnStep ?? "landing");
    setReturnStep(null);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await signInWithGoogle(credentialResponse.credential);

      // Claim the current anonymous session if one exists
      if (sessionId) {
        await claimSession(sessionId);
        toaster.create({
          title: "Report saved to your account",
          type: "success",
        });
      }

      setStep(returnStep ?? "landing");
      setReturnStep(null);
    } catch {
      toaster.create({
        title: "Sign-in failed",
        description: "Could not complete Google sign-in. Please try again.",
        type: "error",
      });
    }
  };

  const handleGoogleError = () => {
    toaster.create({
      title: "Sign-in failed",
      description: "Google sign-in was cancelled or failed. Please try again.",
      type: "error",
    });
  };

  return (
    <Box
      minH="100vh"
      bg="#f8fafc"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Box
        maxW="400px"
        w="100%"
        bg="white"
        borderRadius="16px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        boxShadow="0 4px 24px rgba(0,0,0,0.07)"
        p={8}
      >
        <VStack gap={6} align="center">
          {/* Logo */}
          <HStack gap={2}>
            <Box
              w="36px"
              h="36px"
              borderRadius="9px"
              bg="linear-gradient(135deg, #6366f1, #7c3aed)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
            >
              <Search size={17} strokeWidth={2.5} />
            </Box>
            <Text
              fontWeight="800"
              fontSize="18px"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              Researchio
            </Text>
          </HStack>

          {/* Headline */}
          <VStack gap={1} textAlign="center">
            <Text
              fontSize="20px"
              fontWeight="800"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              Save your reports
            </Text>
            <Text fontSize="13px" color="#64748b" lineHeight="1.6" maxW="280px">
              Sign in to save your analysis and access it from any device.
            </Text>
          </VStack>

          {/* Google button */}
          <Box display="flex" justifyContent="center" w="100%">
            <Box overflow="hidden" borderRadius="12px" display="inline-flex">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                shape="rectangular"
                size="large"
                text="signin_with"
                logo_alignment="left"
                locale="en"
              />
            </Box>
          </Box>

          {/* Value props */}
          <VStack gap={1.5} align="start" w="100%" px={1}>
            {[
              "Access all past reports across devices",
              "Your data is never shared",
              "Free — no credit card required",
            ].map((item) => (
              <HStack key={item} gap={2}>
                <Box
                  w="5px"
                  h="5px"
                  borderRadius="50%"
                  bg="#6366f1"
                  flexShrink={0}
                />
                <Text fontSize="12px" color="#64748b">
                  {item}
                </Text>
              </HStack>
            ))}
          </VStack>

          {/* Back link */}
          <Button
            variant="ghost"
            size="sm"
            fontSize="12px"
            color="#94a3b8"
            gap={1}
            _hover={{ color: "#374151", bg: "transparent" }}
            onClick={handleBack}
          >
            <ArrowLeft size={13} />
            Go back
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
