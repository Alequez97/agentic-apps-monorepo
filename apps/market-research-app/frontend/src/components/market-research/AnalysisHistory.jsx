import { Box, Button, HStack, Skeleton, Text, VStack } from "@chakra-ui/react";
import {
  BarChart2,
  ChevronRight,
  Clock,
  Trash2,
  FileText,
  Inbox,
  RefreshCcw,
  Search,
} from "lucide-react";

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusStyle(status) {
  if (status === "failed") {
    return {
      bg: "rgba(239,68,68,0.08)",
      borderColor: "rgba(239,68,68,0.25)",
      dot: "#dc2626",
      color: "#b91c1c",
      label: "Failed",
    };
  }

  if (status === "analyzing") {
    return {
      bg: "#eef2ff",
      borderColor: "#c7d2fe",
      dot: "#6366f1",
      color: "#4f46e5",
      label: "Running",
    };
  }

  if (status === "canceled") {
    return {
      bg: "#f8fafc",
      borderColor: "#e2e8f0",
      dot: "#64748b",
      color: "#475569",
      label: "Canceled",
    };
  }

  return {
    bg: "rgba(22,163,74,0.08)",
    borderColor: "rgba(22,163,74,0.25)",
    dot: "#16a34a",
    color: "#15803d",
    label: "Complete",
  };
}

function HistoryRow({ entry, isLast, onOpen, onRestart, onDelete, isDeleting }) {
  const statusStyle = getStatusStyle(entry.status);

  return (
    <Box
      py={3.5}
      px={4}
      borderBottomWidth={isLast ? "0" : "1px"}
      borderColor="#f1f5f9"
      _hover={{ bg: "#f5f7ff" }}
      transition="background 0.12s"
      cursor="pointer"
      onClick={onOpen}
    >
      <VStack align="stretch" gap={3}>
        <HStack gap={3} align="start">
          <Box
            w="36px"
            h="36px"
            borderRadius="10px"
            bg="#eef2ff"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Search size={15} color="#6366f1" strokeWidth={2} />
          </Box>

          <Box flex="1" minW={0}>
            <HStack justify="space-between" align="start" gap={2}>
              <Text fontSize="14px" fontWeight="600" color="#0f172a" lineClamp={2}>
                {entry.idea || "Untitled analysis"}
              </Text>
              <Box color="#c7d2fe" flexShrink={0} pt={0.5}>
                <ChevronRight size={16} strokeWidth={2.5} />
              </Box>
            </HStack>
            <HStack gap={2} mt={1}>
              <Clock size={11} color="#94a3b8" strokeWidth={2} />
              <Text fontSize="11px" color="#94a3b8" fontWeight="500">
                {formatDate(entry.completedAt)} - {formatTime(entry.completedAt)}
              </Text>
            </HStack>
          </Box>
        </HStack>

        <HStack gap={2} flexWrap="wrap" justify="space-between">
          <HStack gap={2} flexWrap="wrap">
            <HStack
              gap={1.5}
              bg="#f8fafc"
              borderWidth="1px"
              borderColor="#e2e8f0"
              borderRadius="20px"
              px={2.5}
              py={1}
            >
              <BarChart2 size={11} color="#6366f1" strokeWidth={2} />
              <Text fontSize="11px" fontWeight="600" color="#374151">
                {entry.competitorCount} competitors
              </Text>
            </HStack>

            <HStack
              gap={1}
              bg={statusStyle.bg}
              borderWidth="1px"
              borderColor={statusStyle.borderColor}
              borderRadius="20px"
              px={2.5}
              py={1}
            >
              <Box w="5px" h="5px" borderRadius="50%" bg={statusStyle.dot} />
              <Text fontSize="11px" fontWeight="600" color={statusStyle.color}>
                {statusStyle.label}
              </Text>
            </HStack>

            {entry.status === "failed" && (
              <Button
                size="xs"
                variant="outline"
                h="30px"
                px={2.5}
                borderRadius="8px"
                borderColor="#fecaca"
                color="#b91c1c"
                bg="white"
                onClick={(event) => {
                  event.stopPropagation();
                  onRestart(entry);
                }}
              >
                <RefreshCcw size={12} />
                <Text ml={1}>Restart</Text>
              </Button>
            )}
          </HStack>

          <Button
            size="xs"
            variant="ghost"
            h="30px"
            minW="30px"
            px={2}
            borderRadius="8px"
            color="#94a3b8"
            _hover={{ bg: "#fef2f2", color: "#dc2626" }}
            isDisabled={isDeleting}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(entry);
            }}
          >
            <Trash2 size={12} />
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

function EmptyHistory() {
  return (
    <Box py={12} textAlign="center">
      <Box
        w="48px"
        h="48px"
        borderRadius="12px"
        bg="#f1f5f9"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mx="auto"
        mb={3}
      >
        <Inbox size={22} color="#94a3b8" strokeWidth={1.5} />
      </Box>
      <Text fontSize="14px" fontWeight="700" color="#374151" mb={1}>
        No analyses yet
      </Text>
      <Text fontSize="13px" color="#94a3b8">
        Run your first competitor analysis to see history here.
      </Text>
    </Box>
  );
}

function HistoryLoading() {
  return (
    <Box>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          py={3.5}
          px={4}
          borderBottomWidth={i === 2 ? "0" : "1px"}
          borderColor="#f1f5f9"
        >
          <HStack gap={4} align="center">
            <Skeleton w="32px" h="32px" borderRadius="8px" flexShrink={0} />
            <Box flex="1" minW={0}>
              <Skeleton h="13px" w="60%" mb={1.5} />
              <Skeleton h="11px" w="35%" />
            </Box>
            <Skeleton h="24px" w="100px" borderRadius="20px" />
          </HStack>
        </Box>
      ))}
    </Box>
  );
}

export function AnalysisHistory({
  history,
  isLoading,
  onClear,
  onOpen,
  onRestart,
  onDelete,
  isDeleting,
}) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="#e2e8f0" borderRadius="16px" overflow="hidden">
      <HStack px={4} py={3.5} borderBottomWidth="1px" borderColor="#f1f5f9" justify="space-between">
        <HStack gap={2}>
          <Box color="#6366f1">
            <FileText size={15} strokeWidth={2} />
          </Box>
          <Text fontSize="14px" fontWeight="700" color="#0f172a">
            Analysis history
          </Text>
          {history.length > 0 && (
            <Box bg="#eef2ff" borderRadius="20px" px={2} py={0.5}>
              <Text fontSize="11px" fontWeight="700" color="#6366f1">
                {history.length}
              </Text>
            </Box>
          )}
        </HStack>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            fontSize="11px"
            fontWeight="500"
            color="#94a3b8"
            borderRadius="6px"
            h="24px"
            px={2}
            _hover={{ bg: "#fef2f2", color: "#dc2626" }}
            onClick={onClear}
          >
            Clear all
          </Button>
        )}
      </HStack>

      {isLoading && history.length === 0 ? (
        <HistoryLoading />
      ) : history.length === 0 ? (
        <EmptyHistory />
      ) : (
        <VStack gap={0} align="stretch">
          {history.map((entry, i) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              isLast={i === history.length - 1}
              onOpen={() => onOpen(entry)}
              onRestart={onRestart}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
}
