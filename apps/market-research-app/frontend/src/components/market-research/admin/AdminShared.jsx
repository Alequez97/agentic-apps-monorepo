import { Badge, Box, Button, Flex, HStack, Spinner, Text } from "@chakra-ui/react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { ACCENT, BORDER, CARD_BG, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from "./admin-theme";

export function SectionCard({ children, ...props }) {
  return (
    <Box
      bg={CARD_BG}
      border="1px solid"
      borderColor={BORDER}
      borderRadius="16px"
      p={{ base: 4, md: 5 }}
      {...props}
    >
      {children}
    </Box>
  );
}

export function ClickableListCard({ children, onClick }) {
  return (
    <SectionCard
      role="button"
      tabIndex={0}
      cursor="pointer"
      transition="transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease"
      _hover={{
        borderColor: "#c7d2fe",
        boxShadow: "0 18px 40px rgba(99, 102, 241, 0.08)",
        transform: "translateY(-1px)",
      }}
      _focusVisible={{
        outline: "2px solid #818cf8",
        outlineOffset: "2px",
      }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      {children}
    </SectionCard>
  );
}

export function StatCard({ label, value, accent }) {
  return (
    <SectionCard>
      <Text
        fontSize="11px"
        fontWeight="700"
        color={TEXT_MUTED}
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={1}
      >
        {label}
      </Text>
      <Text fontSize="26px" fontWeight="800" color={accent || TEXT_PRIMARY} letterSpacing="-0.02em">
        {value ?? "-"}
      </Text>
    </SectionCard>
  );
}

export function Label({ children }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      color={TEXT_MUTED}
      textTransform="uppercase"
      letterSpacing="0.06em"
      mb={1}
    >
      {children}
    </Text>
  );
}

export function MetaItem({ label, value, children }) {
  return (
    <Box minW={0}>
      <Label>{label}</Label>
      {children || (
        <Text fontSize="14px" color={TEXT_PRIMARY} lineHeight="1.6" wordBreak="break-word">
          {value ?? "-"}
        </Text>
      )}
    </Box>
  );
}

export function LoadingCard() {
  return (
    <SectionCard>
      <Flex justify="center" py={10}>
        <Spinner color={ACCENT} />
      </Flex>
    </SectionCard>
  );
}

export function EmptyCard({ children }) {
  return (
    <SectionCard>
      <Text fontSize="14px" color={TEXT_MUTED}>
        {children}
      </Text>
    </SectionCard>
  );
}

export function PanelTabs({ value, onChange }) {
  return (
    <HStack gap={2} flexWrap="wrap">
      {[
        ["users", "Users"],
        ["sessions", "Sessions"],
      ].map(([tabValue, label]) => (
        <Button
          key={tabValue}
          size="sm"
          borderRadius="999px"
          px={4}
          bg={value === tabValue ? ACCENT : "white"}
          color={value === tabValue ? "white" : TEXT_SECONDARY}
          border="1px solid"
          borderColor={value === tabValue ? ACCENT : BORDER}
          _hover={{ bg: value === tabValue ? ACCENT : "#eef2ff" }}
          onClick={() => onChange(tabValue)}
        >
          {label}
        </Button>
      ))}
    </HStack>
  );
}

export function BackButton({ onClick, children = "Back" }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      color={TEXT_SECONDARY}
      pl={0}
      _hover={{ bg: "transparent", color: TEXT_PRIMARY }}
      onClick={onClick}
    >
      <ArrowLeft size={14} />
      <Text ml={2}>{children}</Text>
    </Button>
  );
}

export function PaginationBar({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  for (let value = 1; value <= totalPages; value += 1) {
    if (value === 1 || value === totalPages || Math.abs(value - page) <= 1) {
      pages.push(value);
      continue;
    }

    const last = pages[pages.length - 1];
    if (last !== "...") {
      pages.push("...");
    }
  }

  return (
    <SectionCard p={{ base: 3, md: 4 }}>
      <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
        <Box>
          <Text
            fontSize="12px"
            fontWeight="700"
            color={TEXT_MUTED}
            textTransform="uppercase"
            letterSpacing="0.06em"
          >
            Pagination
          </Text>
          <Text fontSize="14px" color={TEXT_SECONDARY} mt={1}>
            Page {page} of {totalPages}
          </Text>
        </Box>

        <HStack gap={2} flexWrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
          <Button
            size="sm"
            variant="outline"
            borderRadius="999px"
            borderColor={BORDER}
            color={TEXT_SECONDARY}
            disabled={page === 1}
            onClick={() => onChange(Math.max(1, page - 1))}
          >
            <ChevronLeft size={14} />
            Prev
          </Button>

          {pages.map((entry, index) =>
            entry === "..." ? (
              <Text key={`ellipsis-${index}`} px={1.5} color={TEXT_MUTED} fontSize="13px">
                ...
              </Text>
            ) : (
              <Button
                key={entry}
                size="sm"
                minW="36px"
                borderRadius="999px"
                px={3}
                bg={entry === page ? ACCENT : "white"}
                color={entry === page ? "white" : TEXT_SECONDARY}
                border="1px solid"
                borderColor={entry === page ? ACCENT : BORDER}
                _hover={{ bg: entry === page ? ACCENT : "#eef2ff" }}
                onClick={() => onChange(entry)}
              >
                {entry}
              </Button>
            ),
          )}

          <Button
            size="sm"
            variant="outline"
            borderRadius="999px"
            borderColor={BORDER}
            color={TEXT_SECONDARY}
            disabled={page === totalPages}
            onClick={() => onChange(Math.min(totalPages, page + 1))}
          >
            Next
            <ChevronRight size={14} />
          </Button>
        </HStack>
      </Flex>
    </SectionCard>
  );
}

export function ToneBadge({ children, colorPalette = "gray", ...props }) {
  return (
    <Badge colorPalette={colorPalette} borderRadius="999px" px={2.5} {...props}>
      {children}
    </Badge>
  );
}
