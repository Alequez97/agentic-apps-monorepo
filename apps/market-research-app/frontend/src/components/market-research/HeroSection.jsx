import { Badge, Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDir="column"
      alignItems="center"
      justifyContent="center"
      pt={{ base: "96px", md: "88px" }}
      pb={{ base: "36px", md: "60px" }}
      px={{ base: 4, md: 6 }}
      position="relative"
      overflow="hidden"
      textAlign="center"
    >
      <Box
        position="absolute"
        top="-60px"
        left="50%"
        transform="translateX(-50%)"
        w="900px"
        h="700px"
        bg="radial-gradient(ellipse at 50% 30%, rgba(99,102,241,.08) 0%, transparent 65%)"
        pointerEvents="none"
      />

      <VStack gap={{ base: 5, md: 7 }} position="relative" maxW="700px">
        <Badge
          display="inline-flex"
          alignItems="center"
          gap={1.5}
          bg="#f5f3ff"
          borderWidth="1px"
          borderColor="#ddd6fe"
          borderRadius="9999px"
          px={3.5}
          py={1}
          fontSize="11px"
          fontWeight="600"
          color="#6366f1"
        >
          <Box
            w="5px"
            h="5px"
            borderRadius="50%"
            bg="#818cf8"
            css={{
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          AI-powered competitive intelligence
        </Badge>

        <Heading
          fontSize={{ base: "34px", md: "52px" }}
          fontWeight="800"
          color="#0f172a"
          lineHeight="1.1"
          letterSpacing="-0.03em"
        >
          Is your idea
          <br />
          <Box
            as="span"
            bg="linear-gradient(135deg, #6366f1, #a855f7)"
            bgClip="text"
            css={{ WebkitTextFillColor: "transparent" }}
          >
            worth building?
          </Box>
        </Heading>

        <Text
          fontSize={{ base: "14px", md: "16px" }}
          color="#64748b"
          lineHeight="1.7"
          maxW="500px"
        >
          Describe your product idea. Our AI explores the competitive
          landscape, finds gaps, maps pricing, and gives you a go/no-go verdict
          - in minutes.
        </Text>

        <Button
          display="inline-flex"
          alignItems="center"
          gap={2.5}
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          color="white"
          borderRadius="12px"
          px={{ base: 6, md: 8 }}
          h={{ base: "48px", md: "52px" }}
          fontSize={{ base: "14px", md: "15px" }}
          fontWeight="700"
          letterSpacing="-0.01em"
          boxShadow="0 4px 16px rgba(99,102,241,.4)"
          transition="all 0.15s"
          _hover={{
            opacity: 0.93,
            boxShadow: "0 6px 24px rgba(99,102,241,.5)",
            transform: "translateY(-1px)",
          }}
          _active={{ transform: "none" }}
          onClick={() => navigate("/analyze")}
        >
          <Search size={16} strokeWidth={2.5} />
          Get started free
        </Button>

        <Text fontSize="12px" color="#94a3b8">
          Results in ~5 minutes
        </Text>
      </VStack>
    </Box>
  );
}
