import { Box, Text } from "@chakra-ui/react";

export function CompetitorLogo({ competitor, size = 32 }) {
  const isLarge = size >= 44;
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius={isLarge ? "10px" : "8px"}
      bg={competitor.logoBg}
      borderWidth="1px"
      borderColor={`${competitor.logoColor}33`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <Text
        fontSize={isLarge ? "11px" : "10px"}
        fontWeight="800"
        color={competitor.logoColor}
        letterSpacing="-0.02em"
      >
        {competitor.logoChar}
      </Text>
    </Box>
  );
}
