import { Box, HStack, Text } from "@chakra-ui/react";
import { HERO_STATS } from "./constants";

export function SocialProof() {
  return (
    <HStack
      justify="center"
      gap={6}
      mt={12}
      flexWrap="wrap"
      fontSize="11px"
      color="#64748b"
      position="relative"
    >
      {HERO_STATS.map(({ icon: Icon, value, label }, i) => (
        <HStack key={label} gap={1.5} align="center">
          {i > 0 && (
            <Box w="3px" h="3px" borderRadius="50%" bg="#cbd5e1" mr={1.5} />
          )}
          <Icon
            size={12}
            color={label.includes("No credit") ? "#16a34a" : "#6366f1"}
            strokeWidth={2}
          />
          <Text>
            <Text as="span" fontWeight="700" color="#0f172a">
              {value}
            </Text>{" "}
            {label}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}
