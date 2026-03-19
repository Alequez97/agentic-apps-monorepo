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
import { ANALYSIS_STATUS, CANCELED_STAGE, STATUS_STYLES } from "./constants";

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
  return STATUS_STYLES[status] || STATUS_STYLES[ANALYSIS_STATUS.COMPLETE];
}

function HistoryRow({ entry, isLast, onOpen, onRestart, onDelete, isDeleting }) {
  const statusStyle = getStatusStyle(entry.status);
  const canRestart =
    entry.status === ANALYSIS_STATUS.FAILED ||
    entry.status === ANALYSIS_STATUS.CANCELED ||
    entry.status === ANALYSIS_STATUS.VALIDATION_FAILED;
  const restartLabel =
    entry.status === ANALYSIS_STATUS.CANCELED && entry.restartCreditCost === 1
      ? "Resume - 1 credit"
      : "Restart";
  const canceledStageCopy =
    entry.canceledAtStage === CANCELED_STAGE.SUMMARY
      ? "Resume will continue from the summary step and charge 1 credit."
      : entry.canceledAtStage === CANCELED_STAGE.COMPETITORS
        ? "Resume will continue the missing competitor work and final summary for 1 credit."
        : null;

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
          <VStack align="start" gap={1}>
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

              {canRestart && (
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
                  <Text ml={1}>{restartLabel}</Text>
                </Button>
              )}
            </HStack>
            {entry.status === ANALYSIS_STATUS.CANCELED && canceledStageCopy ? (
              <Text fontSize="11px" color="#64748b">
                {canceledStageCopy}
              </Text>
            ) : null}
          </VStack>

          <Button
            size="xs"
            variant="ghost"
            h="auto"
            minW="auto"
            p={2.5}
            borderRadius="8px"
            color="#94a3b8"
            _hover={{ bg: "#fef2f2", color: "#dc2626" }}
            _active={{ bg: "#fee2e2" }}
            isDisabled={isDeleting}
            cursor="pointer"
            sx={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onDelete(entry);
            }}
            onTouchEnd={(event) => {
              event.stopPropagation();
              event.preventDefault();
            }}
          >
            <Trash2 size={14} />
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
