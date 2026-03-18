import { Badge, Box, Button, HStack, Text } from "@chakra-ui/react";
import { LogOut, User } from "lucide-react";

function getInitials(email) {
  if (!email) return "?";
  const [local] = email.split("@");
  return local.slice(0, 2).toUpperCase();
}

export function ProfileHeader({ user, onSignOut }) {
  const initials = getInitials(user.email);

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="#e2e8f0"
      borderRadius="16px"
      p={6}
      mb={5}
    >
      <HStack gap={5} align="start" flexWrap="wrap">
        {/* Avatar */}
        {user.picture ? (
          <Box
            as="img"
            src={user.picture}
            alt={user.name ?? user.email}
            w="64px"
            h="64px"
            borderRadius="50%"
            objectFit="cover"
            flexShrink={0}
          />
        ) : (
          <Box
            w="64px"
            h="64px"
            borderRadius="50%"
            bg="linear-gradient(135deg, #6366f1, #7c3aed)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Text
              fontSize="20px"
              fontWeight="800"
              color="white"
              letterSpacing="-0.01em"
            >
              {initials}
            </Text>
          </Box>
        )}

        {/* Details */}
        <Box flex="1" minW={0}>
          <HStack gap={2} mb={1} flexWrap="wrap">
            <Text
              fontSize="18px"
              fontWeight="800"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              {user.name ?? user.email}
            </Text>
            <Badge
              px={2}
              py={0.5}
              borderRadius="20px"
              bg="#f1f5f9"
              color="#64748b"
              fontSize="10px"
              fontWeight="700"
              letterSpacing="0.06em"
            >
              {String(user.plan ?? "free").toUpperCase()}
            </Badge>
            <Badge
              px={2}
              py={0.5}
              borderRadius="20px"
              bg="#ecfeff"
              color="#0f766e"
              fontSize="10px"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {user.creditsRemaining ?? 0} CREDITS LEFT
            </Badge>
          </HStack>

          <HStack gap={1.5} mb={3}>
            <User size={12} color="#94a3b8" strokeWidth={2} />
            <Text fontSize="13px" color="#64748b" fontWeight="500">
              {user.email}
            </Text>
          </HStack>

          <Button
            size="sm"
            variant="outline"
            fontSize="12px"
            fontWeight="600"
            borderColor="#fecdd3"
            color="#e11d48"
            borderRadius="8px"
            h="30px"
            px={3}
            gap={1.5}
            _hover={{ bg: "#fff1f2", borderColor: "#fb7185" }}
            onClick={onSignOut}
          >
            <LogOut size={12} />
            Sign out
          </Button>
        </Box>
      </HStack>
    </Box>
  );
}
