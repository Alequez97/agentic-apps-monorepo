import { useState, useRef, useEffect } from "react";
import { Box, HStack, Text, VStack, Input } from "@chakra-ui/react";
import { Globe, MapPin, X, ChevronDown, Search } from "lucide-react";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";
import { COUNTRIES } from "./constants";

function CountryMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const filtered = query.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()),
      )
    : COUNTRIES;

  const toggle = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const remove = (code, e) => {
    e.stopPropagation();
    onChange(selected.filter((c) => c !== code));
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedNames = selected.map(
    (code) => COUNTRIES.find((c) => c.code === code)?.name ?? code,
  );

  return (
    <Box ref={containerRef} position="relative" w="full">
      {/* Trigger */}
      <Box
        onClick={() => setOpen((o) => !o)}
        borderWidth="1px"
        borderColor={open ? "#6366f1" : "#e2e8f0"}
        borderRadius="8px"
        px={3}
        py={2}
        cursor="pointer"
        bg="white"
        minH="38px"
        display="flex"
        alignItems="center"
        gap={2}
        flexWrap="wrap"
        boxShadow={open ? "0 0 0 3px rgba(99,102,241,.1)" : "none"}
        transition="all 0.15s"
        userSelect="none"
      >
        {selected.length === 0 ? (
          <Text fontSize="14px" color="#94a3b8" flex={1}>
            Choose countries…
          </Text>
        ) : (
          <HStack gap={1.5} flex={1} flexWrap="wrap">
            {selectedNames.map((name, i) => (
              <HStack
                key={selected[i]}
                gap={1}
                bg="#ede9fe"
                color="#5b21b6"
                px={1.5}
                py={0.5}
                borderRadius="4px"
                fontSize="11px"
                fontWeight="500"
              >
                <Text>{name}</Text>
                <Box
                  as="button"
                  onClick={(e) => remove(selected[i], e)}
                  lineHeight={1}
                  _hover={{ color: "#7c3aed" }}
                >
                  <X size={10} />
                </Box>
              </HStack>
            ))}
          </HStack>
        )}
        <Box
          color="#94a3b8"
          transform={open ? "rotate(180deg)" : "rotate(0deg)"}
          transition="transform 0.15s"
        >
          <ChevronDown size={14} />
        </Box>
      </Box>

      {/* Dropdown */}
      {open && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          zIndex={50}
          bg="white"
          borderWidth="1px"
          borderColor="#e2e8f0"
          borderRadius="10px"
          boxShadow="0 8px 24px rgba(0,0,0,.1)"
          overflow="hidden"
        >
          {/* Search */}
          <Box
            px={2.5}
            pt={2.5}
            pb={1.5}
            borderBottomWidth="1px"
            borderColor="#f1f5f9"
          >
            <HStack gap={1.5} bg="#f8fafc" borderRadius="6px" px={2.5} py={1.5}>
              <Search size={12} color="#94a3b8" />
              <Box
                as="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries…"
                fontSize="12px"
                color="#1e293b"
                bg="transparent"
                border="none"
                outline="none"
                flex={1}
                _placeholder={{ color: "#94a3b8" }}
              />
            </HStack>
          </Box>

          {/* List */}
          <Box maxH="200px" overflowY="auto">
            {filtered.length === 0 ? (
              <Text fontSize="12px" color="#94a3b8" textAlign="center" py={4}>
                No countries found
              </Text>
            ) : (
              filtered.map((country) => {
                const isSelected = selected.includes(country.code);
                return (
                  <HStack
                    key={country.code}
                    px={3}
                    py={2}
                    gap={2.5}
                    cursor="pointer"
                    bg={isSelected ? "#f5f3ff" : "transparent"}
                    _hover={{ bg: isSelected ? "#ede9fe" : "#f8fafc" }}
                    onClick={() => toggle(country.code)}
                    transition="background 0.1s"
                  >
                    {/* Checkbox */}
                    <Box
                      w="14px"
                      h="14px"
                      borderRadius="3px"
                      borderWidth="1.5px"
                      borderColor={isSelected ? "#6366f1" : "#cbd5e1"}
                      bg={isSelected ? "#6366f1" : "white"}
                      flexShrink={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      transition="all 0.1s"
                    >
                      {isSelected && (
                        <Box
                          as="svg"
                          viewBox="0 0 10 8"
                          w="8px"
                          h="8px"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.8"
                        >
                          <path d="M1 4l3 3 5-6" />
                        </Box>
                      )}
                    </Box>
                    <Text
                      fontSize="12px"
                      color={isSelected ? "#5b21b6" : "#374151"}
                      fontWeight={isSelected ? "500" : "400"}
                    >
                      {country.name}
                    </Text>
                  </HStack>
                );
              })
            )}
          </Box>

          {/* Footer */}
          {selected.length > 0 && (
            <HStack
              justify="space-between"
              px={3}
              py={2}
              borderTopWidth="1px"
              borderColor="#f1f5f9"
            >
              <Text fontSize="11px" color="#64748b">
                {selected.length} selected
              </Text>
              <Box
                as="button"
                fontSize="11px"
                color="#6366f1"
                fontWeight="500"
                _hover={{ color: "#4f46e5" }}
                onClick={() => onChange([])}
              >
                Clear all
              </Box>
            </HStack>
          )}
        </Box>
      )}
    </Box>
  );
}

export function RegionSelector() {
  const regions = useMarketResearchStore((s) => s.regions);
  const setRegions = useMarketResearchStore((s) => s.setRegions);

  const isWorldwide = regions === null;

  return (
    <VStack align="start" gap={2.5}>
      <Text
        fontSize="11px"
        fontWeight="600"
        color="#64748b"
        textTransform="uppercase"
        letterSpacing="0.05em"
      >
        Target Region
      </Text>

      {/* Segmented toggle */}
      <HStack
        gap={0}
        borderRadius="8px"
        borderWidth="1px"
        borderColor="#e2e8f0"
        p="3px"
        bg="#f8fafc"
        w="full"
      >
        <Box
          as="button"
          flex={1}
          py={1.5}
          borderRadius="6px"
          fontSize="14px"
          fontWeight={isWorldwide ? "600" : "400"}
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={1.5}
          transition="all 0.15s"
          bg={isWorldwide ? "white" : "transparent"}
          color={isWorldwide ? "#1e293b" : "#64748b"}
          boxShadow={isWorldwide ? "0 1px 3px rgba(0,0,0,.08)" : "none"}
          onClick={() => setRegions(null)}
        >
          <Globe size={13} />
          Worldwide
        </Box>
        <Box
          as="button"
          flex={1}
          py={1.5}
          borderRadius="6px"
          fontSize="14px"
          fontWeight={!isWorldwide ? "600" : "400"}
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={1.5}
          transition="all 0.15s"
          bg={!isWorldwide ? "white" : "transparent"}
          color={!isWorldwide ? "#6366f1" : "#64748b"}
          boxShadow={!isWorldwide ? "0 1px 3px rgba(0,0,0,.08)" : "none"}
          onClick={() => {
            if (isWorldwide) setRegions([]);
          }}
        >
          <MapPin size={12} />
          Select Region
        </Box>
      </HStack>

      {/* Country picker — shown only when region mode is active */}
      {!isWorldwide && (
        <Box w="full">
          <CountryMultiSelect selected={regions} onChange={setRegions} />
        </Box>
      )}
    </VStack>
  );
}
