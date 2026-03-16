import { Box, HStack, Text } from "@chakra-ui/react";
import { Search } from "lucide-react";

export function NavLogo({ onClick }) {
  return (
    <HStack gap={2} cursor={onClick ? "pointer" : "default"} onClick={onClick}>
      <Box
        w="28px"
        h="28px"
        borderRadius="7px"
        bg="linear-gradient(135deg, #6366f1, #7c3aed)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
      >
        <Search size={14} strokeWidth={2.5} />
      </Box>
      <Text
        fontWeight="700"
        fontSize="14px"
        color="#0f172a"
        letterSpacing="-0.01em"
      >
        Researchio
        <Text
          as="sup"
          fontSize="8px"
          fontWeight="700"
          letterSpacing="0.08em"
          color="#6366f1"
          ml={0.5}
        >
          BETA
        </Text>
      </Text>
    </HStack>
  );
}
