import { Box, HStack } from "@chakra-ui/react";
import { FEATURES } from "./constants";

export function FeaturePills() {
  return (
    <HStack
      justify="center"
      gap={2.5}
      mt={13}
      flexWrap="wrap"
      maxW="640px"
      mx="auto"
      position="relative"
    >
      {FEATURES.map(({ icon: Icon, label, color }) => (
        <HStack
          key={label}
          gap={2}
          bg="white"
          borderWidth="1px"
          borderColor="#e2e8f0"
          borderRadius="10px"
          px={3.5}
          py={2}
          fontSize="12px"
          color="#374151"
          fontWeight="500"
          boxShadow="0 1px 3px rgba(0,0,0,.05)"
        >
          <Box
            w="22px"
            h="22px"
            borderRadius="6px"
            bg={`${color}1a`}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon size={13} color={color} strokeWidth={2.2} />
          </Box>
          {label}
        </HStack>
      ))}
    </HStack>
  );
}
