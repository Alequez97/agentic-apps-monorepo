import { cloneElement, isValidElement, useState } from "react";
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
  const mobileRight =
    right && isValidElement(right)
      ? cloneElement(right, {
          isMobileMenu: true,
          onAction: () => setOpen(false),
        })
      : right;

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
        h={{ base: "64px", md: "56px" }}
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
            color="#374151"
            borderRadius="10px"
            h="44px"
            w="44px"
            minW="44px"
            p={0}
            _hover={{ bg: "#f1f5f9" }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </Box>
      </Box>

      {/* Mobile / Tablet dropdown */}
      {open && right && (
        <Box
          display={{ base: "flex", lg: "none" }}
          flexDirection="column"
          position="fixed"
          top={{ base: "64px", md: "56px" }}
          left="0"
          right="0"
          zIndex="99"
          bg="white"
          borderBottomWidth="1px"
          borderColor="#e4e4e7"
          boxShadow="0 4px 16px rgba(0,0,0,0.07)"
          px={0}
          py={0}
        >
          <VStack align="stretch" gap={0}>
            {mobileRight}
          </VStack>
        </Box>
      )}
    </>
  );
}
