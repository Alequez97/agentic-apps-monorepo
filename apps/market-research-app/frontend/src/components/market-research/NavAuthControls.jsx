import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { LogOut, User, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * Auth controls rendered in the navbar right slot.
 * Shows user avatar + profile link + sign out when authenticated,
 * or a "Sign in" button when anonymous.
 */
export function NavAuthControls({ isMobileMenu = false, onAction }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const goToProfile = () => {
    navigate("/profile");
    onAction?.();
  };
  
  const goToAdmin = () => {
    navigate("/admin");
    onAction?.();
  };

  const handleSignIn = () => {
    navigate("/login", { state: { returnTo: pathname } });
    onAction?.();
  };

  const handleSignOut = () => {
    signOut();
    onAction?.();
  };

  if (!user) {
    if (isMobileMenu) {
      return (
        <Button
          variant="ghost"
          justifyContent="flex-start"
          fontSize="15px"
          fontWeight="600"
          color="#0f172a"
          borderRadius="0"
          h="60px"
          px={4}
          w="100%"
          borderBottomWidth="1px"
          borderColor="#e4e4e7"
          _hover={{ bg: "#f8fafc" }}
          onClick={handleSignIn}
        >
          Sign in
        </Button>
      );
    }

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

  if (isMobileMenu) {
    return (
      <VStack align="stretch" gap={0} w="100%">
        <Box
          as="button"
          type="button"
          w="100%"
          textAlign="left"
          px={4}
          py={3.5}
          borderBottomWidth="1px"
          borderColor="#e4e4e7"
          _hover={{ bg: "#f8fafc" }}
          onClick={goToProfile}
        >
          <HStack gap={3} minW={0}>
            {user.picture ? (
              <Box
                as="img"
                src={user.picture}
                alt={user.name ?? user.email}
                w="34px"
                h="34px"
                borderRadius="50%"
                flexShrink={0}
                objectFit="cover"
              />
            ) : (
              <Box
                w="34px"
                h="34px"
                borderRadius="50%"
                bg="linear-gradient(135deg, #6366f1, #7c3aed)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <User size={16} color="white" strokeWidth={2.5} />
              </Box>
            )}
            <Box minW={0}>
              <Text fontSize="15px" fontWeight="600" color="#0f172a" truncate>
                {user.name ?? user.email}
              </Text>
              <Text fontSize="13px" color="#64748b" truncate>
                {user.email}
              </Text>
            </Box>
          </HStack>
        </Box>

        {user.isAdmin && (
          <Button
            variant="ghost"
            justifyContent="flex-start"
            fontSize="15px"
            fontWeight="600"
            color="#64748b"
            borderRadius="0"
            h="60px"
            px={4}
            w="100%"
            borderBottomWidth="1px"
            borderColor="#e4e4e7"
            _hover={{ bg: "#f0f9ff", color: "#0369a1" }}
            onClick={goToAdmin}
          >
            <Shield size={16} style={{ marginRight: "10px" }} />
            Admin
          </Button>
        )}

        <Button
          variant="ghost"
          justifyContent="flex-start"
          fontSize="15px"
          fontWeight="600"
          color="#64748b"
          borderRadius="0"
          h="60px"
          px={4}
          w="100%"
          _hover={{ bg: "#fef2f2", color: "#dc2626" }}
          onClick={handleSignOut}
        >
          <LogOut size={16} style={{ marginRight: "10px" }} />
          Sign out
        </Button>
      </VStack>
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
        <Text fontSize="12px" fontWeight="500" color="#374151" maxW="140px" truncate>
          {user.name ?? user.email}
        </Text>
      </HStack>

      {user.isAdmin && (
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
          _hover={{ bg: "#f0f9ff", color: "#0369a1" }}
          onClick={goToAdmin}
          w={{ base: "100%", lg: "auto" }}
        >
          <Shield size={13} />
          Admin
        </Button>
      )}

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
        onClick={handleSignOut}
        w={{ base: "100%", lg: "auto" }}
      >
        <LogOut size={13} />
        Sign out
      </Button>
    </Box>
  );
}
