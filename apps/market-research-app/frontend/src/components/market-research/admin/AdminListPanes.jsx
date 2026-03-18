import { useEffect, useState } from "react";
import { Box, Flex, Grid, HStack, Stack, Text, VStack } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import { getSessions, getUsers } from "../../../api/admin";
import { ACCENT, fmtDate, getStatusTone, getValidationMeta, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from "./admin-theme";
import { ClickableListCard, EmptyCard, LoadingCard, MetaItem, PaginationBar, ToneBadge } from "./AdminShared";

export function SessionSummaryCard({ session, onOpen }) {
  const validationMeta = getValidationMeta(session.state?.promptValidation);

  return (
    <ClickableListCard onClick={onOpen}>
      <Stack gap={4}>
        <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
          <Box flex="1" minW="0">
            <Text fontSize="16px" fontWeight="700" color={TEXT_PRIMARY} lineHeight="1.4">
              {session.idea}
            </Text>
            <Text fontSize="12px" color={TEXT_MUTED} mt={1}>
              Created {fmtDate(session.createdAt)}
            </Text>
          </Box>
          <Box color={TEXT_MUTED} pt={1}>
            <ChevronRight size={16} />
          </Box>
        </Flex>

        <HStack gap={2} flexWrap="wrap">
          <ToneBadge colorPalette={getStatusTone(session.state?.status)}>
            {session.state?.status || "pending"}
          </ToneBadge>
          <ToneBadge colorPalette={validationMeta.palette}>
            Validation {validationMeta.label}
          </ToneBadge>
          <ToneBadge colorPalette="gray">
            {(session.state?.competitorCount ?? 0).toString()} competitors
          </ToneBadge>
        </HStack>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <MetaItem label="Report Summary" value={session.reportSummary || "No summary yet"} />
          <MetaItem label="Prompt Validation">
            <VStack align="start" gap={1}>
              <Text fontSize="14px" color={TEXT_PRIMARY}>
                {validationMeta.label}
              </Text>
              {session.state?.promptValidation?.rejectionReason ? (
                <Text fontSize="13px" color={TEXT_SECONDARY}>
                  Reason: {session.state.promptValidation.rejectionReason}
                </Text>
              ) : null}
              {session.state?.promptValidation?.suggestedPrompt ? (
                <Text fontSize="13px" color={ACCENT} fontStyle="italic" wordBreak="break-word">
                  {session.state.promptValidation.suggestedPrompt}
                </Text>
              ) : null}
            </VStack>
          </MetaItem>
        </Grid>
      </Stack>
    </ClickableListCard>
  );
}

export function UsersPane({ onTotals, navigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  useEffect(() => {
    setLoading(true);
    getUsers(page)
      .then((res) => {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
        onTotals?.({ users: res.data.pagination.total });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, onTotals]);

  if (loading) return <LoadingCard />;
  if (users.length === 0) return <EmptyCard>No users found.</EmptyCard>;

  return (
    <Stack gap={4}>
      {users.map((user) => (
        <ClickableListCard key={user.userId} onClick={() => navigate(`/admin/users/${user.userId}`)}>
          <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
            <Box flex="1" minW="0">
              <Text fontSize="17px" fontWeight="700" color={TEXT_PRIMARY}>
                {user.name || "-"}
              </Text>
              <Text fontSize="13px" color={TEXT_SECONDARY} mt={1} wordBreak="break-word">
                {user.email}
              </Text>
            </Box>
            <Box color={TEXT_MUTED} pt={1}>
              <ChevronRight size={16} />
            </Box>
          </Flex>

          <HStack gap={2} mt={4} flexWrap="wrap">
            <ToneBadge colorPalette={user.plan === "pro" ? "purple" : "gray"}>{user.plan}</ToneBadge>
            {user.isAdmin ? <ToneBadge colorPalette="red">Admin</ToneBadge> : null}
          </HStack>

          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={4} mt={4}>
            <MetaItem label="Credits" value={`${user.creditsRemaining} / ${user.creditsTotal}`} />
            <MetaItem label="Subscription" value={user.subscriptionStatus || "inactive"} />
            <MetaItem label="Last Seen" value={fmtDate(user.lastSeenAt)} />
            <MetaItem label="User Id" value={user.userId} />
          </Grid>
        </ClickableListCard>
      ))}

      <PaginationBar page={page} totalPages={pagination.totalPages} onChange={setPage} />
    </Stack>
  );
}

export function SessionsPane({ onTotals, navigate }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  useEffect(() => {
    setLoading(true);
    getSessions(page)
      .then((res) => {
        setSessions(res.data.data);
        setPagination(res.data.pagination);
        onTotals?.({ sessions: res.data.pagination.total });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, onTotals]);

  if (loading) return <LoadingCard />;
  if (sessions.length === 0) return <EmptyCard>No sessions found.</EmptyCard>;

  return (
    <Stack gap={4}>
      {sessions.map((session) => {
        const validationMeta = getValidationMeta(session.state?.promptValidation);
        return (
          <ClickableListCard
            key={session.sessionId}
            onClick={() => navigate(`/admin/sessions/${session.sessionId}`)}
          >
            <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
              <Box flex="1" minW="0">
                <Text fontSize="16px" fontWeight="700" color={TEXT_PRIMARY} lineHeight="1.4">
                  {session.idea}
                </Text>
                <Text fontSize="12px" color={TEXT_MUTED} mt={1}>
                  {fmtDate(session.createdAt)}
                </Text>
              </Box>
              <Box color={TEXT_MUTED} pt={1}>
                <ChevronRight size={16} />
              </Box>
            </Flex>

            <HStack gap={2} mt={4} flexWrap="wrap">
              <ToneBadge colorPalette={getStatusTone(session.state?.status)}>
                {session.state?.status || "pending"}
              </ToneBadge>
              <ToneBadge colorPalette={validationMeta.palette}>
                Validation {validationMeta.label}
              </ToneBadge>
              <ToneBadge colorPalette="gray">
                {(session.state?.competitorCount ?? 0).toString()} competitors
              </ToneBadge>
            </HStack>

            {session.state?.error ? (
              <Text fontSize="13px" color="#dc2626" mt={4} wordBreak="break-word">
                {session.state.error}
              </Text>
            ) : null}
          </ClickableListCard>
        );
      })}

      <PaginationBar page={page} totalPages={pagination.totalPages} onChange={setPage} />
    </Stack>
  );
}
