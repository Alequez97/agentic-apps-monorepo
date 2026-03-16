import { Box, HStack, Text } from "@chakra-ui/react";
import { CheckCircle } from "lucide-react";

export function InputStatsFooter() {
  return (
    <HStack
      justify="center"
      gap={8}
      pt={4}
      flexWrap="wrap"
      fontSize="11px"
      color="#64748b"
    >
      <HStack gap={1.5}>
        <Box w="3px" h="3px" borderRadius="50%" bg="#cbd5e1" />
        <Text>
          <Text as="span" fontWeight="600" color="#0f172a">
            2,419
          </Text>{" "}
          ideas analyzed
        </Text>
      </HStack>
      <HStack gap={1.5}>
        <CheckCircle size={12} color="#10b981" strokeWidth={2.5} />
        <Text>
          Average{" "}
          <Text as="span" fontWeight="600" color="#0f172a">
            18 mins
          </Text>{" "}
          saved
        </Text>
      </HStack>
      <HStack gap={1.5}>
        <Text>
          ⭐{" "}
          <Text as="span" fontWeight="600" color="#0f172a">
            4.8/5
          </Text>{" "}
          founder rating
        </Text>
      </HStack>
    </HStack>
  );
}
