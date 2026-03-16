import { useState } from "react";
import { Box, Button, HStack, VStack } from "@chakra-ui/react";
import { Menu, X } from "lucide-react";
import { NavLogo } from "./NavLogo";

/**
 * Standard app navbar used across all market research pages.
 * Shows logo + nav links on desktop; collapses to burger on tablet/mobile.
 * Accepts `onLogoClick` and a `right` slot for page-specific actions.
 */
export function AppNavbar({ onLogoClick, right }) {
  const [open, setOpen] = useState(false);

  return (
    <>
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
        px={{ base: 4, md: 8 }}
        h="48px"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left: Logo */}
        <HStack gap={0} flex="1">
          <NavLogo onClick={onLogoClick} />
        </HStack>

        {/* Right: page-specific actions (desktop only) */}
        {right && (
          <HStack display={{ base: "none", lg: "flex" }} gap={2} flex="1" justify="flex-end">
            {right}
          </HStack>
        )}

        {/* Burger button (tablet + mobile) */}
        <Box display={{ base: "flex", lg: "none" }}>
          <Button
            variant="ghost"
            size="sm"
            color="#374151"
            borderRadius="7px"
            h="32px"
            w="32px"
            minW="32px"
            p={0}
            _hover={{ bg: "#f1f5f9" }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </Box>
      </Box>

      {/* Mobile / Tablet dropdown */}
      {open && right && (
        <Box
          display={{ base: "flex", lg: "none" }}
          flexDirection="column"
          position="fixed"
          top="100px"
          left="0"
          right="0"
          zIndex="99"
          bg="white"
          borderBottomWidth="1px"
          borderColor="#e4e4e7"
          boxShadow="0 4px 16px rgba(0,0,0,0.07)"
          px={4}
          py={3}
          gap={1}
        >
          <VStack align="stretch" gap={2}>
            {right}
          </VStack>
        </Box>
      )}
    </>
  );
}
