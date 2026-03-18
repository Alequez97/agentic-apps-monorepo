import { Badge } from "@chakra-ui/react";
import { COMPETITOR_STATUS } from "./constants";

export function CompetitorStatusBadge({ status }) {
  if (status === COMPETITOR_STATUS.DONE) {
    return (
      <Badge
        display="inline-flex"
        alignItems="center"
        gap={1}
        bg="#dcfce7"
        color="#15803d"
        fontSize="10px"
        fontWeight="600"
        px={2}
        py={0.5}
        borderRadius="9999px"
      >
        ✓ Done
      </Badge>
    );
  }

  if (status === COMPETITOR_STATUS.ANALYZING) {
    return (
      <Badge
        display="inline-flex"
        alignItems="center"
        gap={1}
        bg="#eff6ff"
        color="#1d4ed8"
        fontSize="10px"
        fontWeight="600"
        px={2}
        py={0.5}
        borderRadius="9999px"
        css={{
          "@keyframes blink": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.5 },
          },
          animation: "blink 1.4s ease-in-out infinite",
        }}
      >
        ⊙ Analyzing
      </Badge>
    );
  }

  return (
    <Badge
      display="inline-flex"
      alignItems="center"
      gap={1}
      bg="#f1f5f9"
      color="#64748b"
      fontSize="10px"
      fontWeight="600"
      px={2}
      py={0.5}
      borderRadius="9999px"
    >
      Queued
    </Badge>
  );
}
