import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useLocationStore } from "../../store/useLocationStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

/**
 * Auth controls rendered in the navbar right slot.
 * Shows user avatar + profile link + sign out when authenticated,
 * or a "Sign in" button when anonymous.
 */
export function NavAuthControls() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const setReturnStep = useAuthStore((s) => s.setReturnStep);

  const step = useLocationStore((s) => s.step);
  const setStep = useMarketResearchStore((s) => s.setStep);
  const goToProfile = useMarketResearchStore((s) => s.goToProfile);

  const handleSignIn = () => {
    setReturnStep(step);
    setStep("login");
  };

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        fontSize="13px"
        fontWeight="500"
        color="#52525b"
        borderRadius="7px"
        h="30px"
        px={3}
        w={{ base: "100%", lg: "auto" }}
        _hover={{ color: "#0f172a", bg: "#f8fafc" }}
        onClick={handleSignIn}
      >
        Sign in
      </Button>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection={{ base: "column", lg: "row" }}
      gap={1.5}
      w={{ base: "100%", lg: "auto" }}
      alignItems={{ base: "stretch", lg: "center" }}
    >
      {/* User pill */}
      <HStack
        gap={1.5}
        px={2.5}
        py={1}
        borderRadius="7px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        bg="white"
        minW={0}
        cursor="pointer"
        _hover={{ bg: "#f8fafc", borderColor: "#c7d2fe" }}
        transition="all 0.12s"
        onClick={goToProfile}
      >
        {user.picture ? (
          <Box
            as="img"
            src={user.picture}
            alt={user.name ?? user.email}
            w="20px"
            h="20px"
            borderRadius="50%"
            flexShrink={0}
            objectFit="cover"
          />
        ) : (
          <Box
            w="20px"
            h="20px"
            borderRadius="50%"
            bg="linear-gradient(135deg, #6366f1, #7c3aed)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <User size={11} color="white" strokeWidth={2.5} />
          </Box>
        )}
        <Text
          fontSize="12px"
          fontWeight="500"
          color="#374151"
          maxW="140px"
          truncate
        >
          {user.name ?? user.email}
        </Text>
      </HStack>

      {/* Sign out */}
      <Button
        size="sm"
        variant="ghost"
        fontSize="12px"
        fontWeight="500"
        color="#64748b"
        borderRadius="7px"
        px={2}
        h="30px"
        gap={1}
        _hover={{ bg: "#fef2f2", color: "#dc2626" }}
        onClick={signOut}
        w={{ base: "100%", lg: "auto" }}
      >
        <LogOut size={13} />
        Sign out
      </Button>
    </Box>
  );
}
