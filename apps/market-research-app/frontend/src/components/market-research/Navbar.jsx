import { Box, HStack } from "@chakra-ui/react";

// Component files split per project conventions (one component per file)
export { NavLogo } from "./NavLogo";
export { AppNavbar } from "./AppNavbar";
export { NavAuthControls } from "./NavAuthControls";
export { MarketResearchNavbar } from "./MarketResearchNavbar";

/**
 * Generic slot-based nav shell.
 * Accepts `left`, `center`, and `right` as ReactNode slots.
 */
export function Navbar({ left, center, right }) {
  return (
    <Box
      as="nav"
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="100"
      bg="rgba(250,250,250,0.92)"
      backdropFilter="blur(8px)"
      borderBottomWidth="1px"
      borderColor="#e4e4e7"
      px={8}
      h="48px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
    >
      <HStack gap={0} flex="1">
        {left}
      </HStack>

      {center && (
        <HStack justify="center" flex="1">
          {center}
        </HStack>
      )}

      <HStack gap={2} flex="1" justify="flex-end">
        {right}
      </HStack>
    </Box>
  );
}
