import { useEffect, useState } from "react";
import { Badge, Box, Flex, Grid, Stack, Text, VStack } from "@chakra-ui/react";
import { getSessionDetail, getUserDetail } from "../../../api/admin";
import { ACCENT, BORDER, fmtDate, getStatusTone, getValidationMeta, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from "./admin-theme";
import { BackButton, EmptyCard, Label, LoadingCard, MetaItem, SectionCard } from "./AdminShared";
import { SessionSummaryCard } from "./AdminListPanes";

export function UserDetailPane({ userId, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUserDetail(userId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingCard />;
  if (!data) return <EmptyCard>User not found.</EmptyCard>;

  const { user, sessions } = data;

  return (
    <Stack gap={5}>
      <BackButton onClick={() => navigate("/admin")}>Back to admin</BackButton>

      <SectionCard>
        <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
          <Box flex="1" minW="0">
            <Text fontSize="24px" fontWeight="800" color={TEXT_PRIMARY} letterSpacing="-0.02em">
              {user.name || user.email}
            </Text>
            <Text fontSize="14px" color={TEXT_SECONDARY} mt={1} wordBreak="break-word">
              {user.email}
            </Text>
          </Box>
          {user.isAdmin ? (
            <Badge colorPalette="red" borderRadius="999px" px={3} py={1}>
              Admin
            </Badge>
          ) : null}
        </Flex>

        <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={4} mt={5}>
          <MetaItem label="Plan" value={user.plan} />
          <MetaItem label="Credits" value={`${user.creditsRemaining} / ${user.creditsTotal}`} />
          <MetaItem label="Last Seen" value={fmtDate(user.lastSeenAt)} />
          <MetaItem label="User Id" value={user.userId} />
        </Grid>
      </SectionCard>

      <Box>
        <Text fontSize="18px" fontWeight="800" color={TEXT_PRIMARY} mb={3}>
          Sessions and report summaries
        </Text>
        {sessions?.length ? (
          <Stack gap={4}>
            {sessions.map((session) => (
              <SessionSummaryCard
                key={session.sessionId}
                session={session}
                onOpen={() => navigate(`/admin/sessions/${session.sessionId}`)}
              />
            ))}
          </Stack>
        ) : (
          <EmptyCard>No sessions found for this user.</EmptyCard>
        )}
      </Box>
    </Stack>
  );
}

export function SessionDetailPane({ sessionId, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSessionDetail(sessionId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <LoadingCard />;
  if (!data) return <EmptyCard>Session not found.</EmptyCard>;

  const { session, owner, subscription, opportunity, competitors } = data;
  const validation = session.state?.promptValidation;
  const validationMeta = getValidationMeta(validation);

  return (
    <Stack gap={5}>
      <BackButton
        onClick={() =>
          owner?.userId ? navigate(`/admin/users/${owner.userId}`) : navigate("/admin")
        }
      >
        {owner?.userId ? "Back to user" : "Back to admin"}
      </BackButton>

      <SectionCard>
        <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
          <Box flex="1" minW="0">
            <Text fontSize="24px" fontWeight="800" color={TEXT_PRIMARY} letterSpacing="-0.02em">
              {session.idea}
            </Text>
            <Text fontSize="13px" color={TEXT_MUTED} mt={1}>
              Session {session.sessionId}
            </Text>
          </Box>
          <Stack direction="row" gap={2} flexWrap="wrap">
            <Badge colorPalette={getStatusTone(session.state?.status)} borderRadius="999px" px={3}>
              {session.state?.status || "pending"}
            </Badge>
            <Badge colorPalette={validationMeta.palette} borderRadius="999px" px={3}>
              Validation {validationMeta.label}
            </Badge>
          </Stack>
        </Flex>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4} mt={5}>
          <MetaItem label="Created" value={fmtDate(session.createdAt)} />
          <MetaItem label="Competitors" value={session.state?.competitorCount ?? 0} />
          <MetaItem
            label="Owner"
            value={owner ? `${owner.name || owner.email} (${subscription?.plan || "free"})` : "-"}
          />
        </Grid>

        {session.state?.error ? (
          <Box mt={5}>
            <Label>Error</Label>
            <Text fontSize="14px" color="#dc2626" wordBreak="break-word">
              {session.state.error}
            </Text>
          </Box>
        ) : null}
      </SectionCard>

      <Grid templateColumns={{ base: "1fr", lg: "1.2fr 0.8fr" }} gap={5}>
        <SectionCard>
          <Text fontSize="18px" fontWeight="800" color={TEXT_PRIMARY} mb={4}>
            Report details
          </Text>
          <Stack gap={4}>
            <MetaItem label="Opportunity Verdict" value={opportunity?.verdict || "Not available"} />
            <MetaItem label="Opportunity Summary" value={opportunity?.summary || "No summary yet"} />
            <MetaItem label="Prompt Validation">
              <VStack align="start" gap={1}>
                <Text fontSize="14px" color={TEXT_PRIMARY}>
                  {validationMeta.label}
                </Text>
                {validation?.validatedAt ? (
                  <Text fontSize="13px" color={TEXT_SECONDARY}>
                    Checked {fmtDate(validation.validatedAt)}
                  </Text>
                ) : null}
                {validation?.rejectionReason ? (
                  <Text fontSize="13px" color={TEXT_SECONDARY}>
                    Reason: {validation.rejectionReason}
                  </Text>
                ) : null}
                {validation?.suggestedPrompt ? (
                  <Text fontSize="13px" color={ACCENT} fontStyle="italic" wordBreak="break-word">
                    {validation.suggestedPrompt}
                  </Text>
                ) : null}
              </VStack>
            </MetaItem>
          </Stack>
        </SectionCard>

        <SectionCard>
          <Text fontSize="18px" fontWeight="800" color={TEXT_PRIMARY} mb={4}>
            Competitors
          </Text>
          {competitors?.length ? (
            <VStack align="stretch" gap={3}>
              {competitors.map((competitor) => (
                <Box key={competitor.id} border="1px solid" borderColor={BORDER} borderRadius="12px" p={3}>
                  <Text fontSize="14px" fontWeight="700" color={TEXT_PRIMARY}>
                    {competitor.name || competitor.id}
                  </Text>
                  {competitor.website ? (
                    <Text fontSize="12px" color={TEXT_SECONDARY} mt={1} wordBreak="break-word">
                      {competitor.website}
                    </Text>
                  ) : null}
                </Box>
              ))}
            </VStack>
          ) : (
            <Text fontSize="14px" color={TEXT_MUTED}>
              No competitor details saved for this session.
            </Text>
          )}
        </SectionCard>
      </Grid>
    </Stack>
  );
}
