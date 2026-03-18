import { Box, HStack, Text } from "@chakra-ui/react";
import { Activity } from "lucide-react";

export function SummaryHeroBanner({ idea, competitorCount }) {
  const heroStats = [
    { value: String(competitorCount ?? 0), label: "Competitors analyzed" },
    { value: "High", label: "Confidence level" },
  ];

  return (
    <Box
      bg="linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)"
      borderRadius="16px"
      p={{ base: 4, md: 6 }}
      mb={6}
      position="relative"
      overflow="hidden"
    >
      {/* Background subtle grid */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.04}
        backgroundImage="radial-gradient(circle, white 1px, transparent 1px)"
        backgroundSize="24px 24px"
        pointerEvents="none"
      />

      <Box display={{ base: "block", md: "none" }} mb={3}>
        <HStack
          gap={1.5}
          bg="rgba(22,163,74,0.18)"
          borderWidth="1px"
          borderColor="rgba(22,163,74,0.4)"
          borderRadius="20px"
          px={3}
          py={1}
        >
          <Box w="6px" h="6px" borderRadius="50%" bg="#4ade80" />
          <Text fontSize="11px" fontWeight="600" color="#4ade80">
            Analysis complete
          </Text>
        </HStack>
      </Box>

      <Box position="absolute" top={5} right={5} display={{ base: "none", md: "block" }}>
        <HStack
          gap={1.5}
          bg="rgba(22,163,74,0.18)"
          borderWidth="1px"
          borderColor="rgba(22,163,74,0.4)"
          borderRadius="20px"
          px={3}
          py={1}
        >
          <Box w="6px" h="6px" borderRadius="50%" bg="#4ade80" />
          <Text fontSize="11px" fontWeight="600" color="#4ade80">
            Analysis complete
          </Text>
        </HStack>
      </Box>

      {/* Title */}
      <HStack gap={2.5} mb={2} align="start" pr={{ base: 0, md: "168px" }}>
        <Box color="#818cf8">
          <Activity size={18} strokeWidth={2} />
        </Box>
        <Text
          fontSize={{ base: "16px", md: "20px" }}
          fontWeight="800"
          color="white"
          letterSpacing="-0.02em"
          lineHeight="1.15"
        >
          Market Analysis Complete
        </Text>
      </HStack>

      {/* Idea subtitle */}
      {idea && (
        <Text fontSize={{ base: "12px", md: "13px" }} color="#c7d2fe" mb={5} maxW="520px">
          {idea}
        </Text>
      )}

      {/* Stats row */}
      <HStack gap={3} flexWrap="wrap">
        {heroStats.map((stat) => (
          <Box
            key={stat.label}
            bg="rgba(255,255,255,0.07)"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.1)"
            borderRadius="10px"
            px={4}
            py={3}
            minW={{ base: "calc(50% - 6px)", md: "120px" }}
            flex={{ base: "1 1 calc(50% - 6px)", md: "0 0 auto" }}
          >
            <Text
              fontSize={{ base: "18px", md: "22px" }}
              fontWeight="800"
              color="white"
              letterSpacing="-0.02em"
              lineHeight="1.1"
            >
              {stat.value}
            </Text>
            <Text
              fontSize={{ base: "9px", md: "10px" }}
              fontWeight="600"
              color="#94a3b8"
              mt={0.5}
              textTransform="uppercase"
              letterSpacing="0.04em"
            >
              {stat.label}
            </Text>
          </Box>
        ))}
      </HStack>
    </Box>
  );
}
