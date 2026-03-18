import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSessionDetail,
  getSessions,
  getUserDetail,
  getUsers,
} from "../../api/admin";
import { useAuthStore } from "../../store/useAuthStore";

const BG = "#f8fafc";
const CARD_BG = "#ffffff";
const BORDER = "#e2e8f0";
const TEXT_PRIMARY = "#0f172a";
const TEXT_SECONDARY = "#64748b";
const TEXT_MUTED = "#94a3b8";
const ACCENT = "#6366f1";

function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status) {
  if (status === "complete") return "green";
  if (status === "failed" || status === "validation_failed") return "red";
  if (status === "analyzing") return "blue";
  return "gray";
}

function getValidationMeta(validation) {
  if (!validation) {
    return { label: "Not run", palette: "gray" };
  }

  if (validation.shouldContinue) {
    return { label: "Passed", palette: "green" };
  }

  return { label: "Rejected", palette: "red" };
}

function SectionCard({ children, ...props }) {
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

function StatCard({ label, value, accent }) {
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

function Label({ children }) {
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

function MetaItem({ label, value, children }) {
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

function LoadingCard() {
  return (
    <SectionCard>
      <Flex justify="center" py={10}>
        <Spinner color={ACCENT} />
      </Flex>
    </SectionCard>
  );
}

function EmptyCard({ children }) {
  return (
    <SectionCard>
      <Text fontSize="14px" color={TEXT_MUTED}>
        {children}
      </Text>
    </SectionCard>
  );
}

function ClickableListCard({ children, onClick }) {
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

function PanelTabs({ value, onChange }) {
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

function BackButton({ onClick, children = "Back" }) {
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

function PaginationBar({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  for (let value = 1; value <= totalPages; value += 1) {
    if (
      value === 1 ||
      value === totalPages ||
      Math.abs(value - page) <= 1
    ) {
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
          <Text fontSize="12px" fontWeight="700" color={TEXT_MUTED} textTransform="uppercase" letterSpacing="0.06em">
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

function SessionSummaryCard({ session, onOpen }) {
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
          <Badge colorPalette={getStatusTone(session.state?.status)} borderRadius="999px" px={2.5}>
            {session.state?.status || "pending"}
          </Badge>
          <Badge colorPalette={validationMeta.palette} borderRadius="999px" px={2.5}>
            Validation {validationMeta.label}
          </Badge>
          <Badge colorPalette="gray" borderRadius="999px" px={2.5}>
            {(session.state?.competitorCount ?? 0).toString()} competitors
          </Badge>
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

function UsersPane({ onTotals }) {
  const navigate = useNavigate();
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
            <Badge colorPalette={user.plan === "pro" ? "purple" : "gray"} borderRadius="999px" px={2.5}>
              {user.plan}
            </Badge>
            {user.isAdmin ? (
              <Badge colorPalette="red" borderRadius="999px" px={2.5}>
                Admin
              </Badge>
            ) : null}
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

function SessionsPane({ onTotals }) {
  const navigate = useNavigate();
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
              <Badge colorPalette={getStatusTone(session.state?.status)} borderRadius="999px" px={2.5}>
                {session.state?.status || "pending"}
              </Badge>
              <Badge colorPalette={validationMeta.palette} borderRadius="999px" px={2.5}>
                Validation {validationMeta.label}
              </Badge>
              <Badge colorPalette="gray" borderRadius="999px" px={2.5}>
                {(session.state?.competitorCount ?? 0).toString()} competitors
              </Badge>
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

function UserDetailPane({ userId }) {
  const navigate = useNavigate();
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

function SessionDetailPane({ sessionId }) {
  const navigate = useNavigate();
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
          <HStack gap={2} flexWrap="wrap">
            <Badge colorPalette={getStatusTone(session.state?.status)} borderRadius="999px" px={3}>
              {session.state?.status || "pending"}
            </Badge>
            <Badge colorPalette={validationMeta.palette} borderRadius="999px" px={3}>
              Validation {validationMeta.label}
            </Badge>
          </HStack>
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

export function AdminPage() {
  const navigate = useNavigate();
  const { userId, sessionId } = useParams();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState("users");
  const [totals, setTotals] = useState({ users: null, sessions: null });

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate("/");
    }
  }, [user, navigate]);

  const isDetailView = Boolean(userId || sessionId);

  const totalsHandler = useMemo(
    () => (nextTotals) => setTotals((current) => ({ ...current, ...nextTotals })),
    [],
  );

  if (!user || !user.isAdmin) return null;

  return (
    <Box minH="100vh" bg={BG} pt={{ base: "96px", md: "116px" }} pb="80px">
      <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        {!isDetailView ? (
          <Stack gap={6}>
            <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
              <Box>
                <Text fontSize="24px" fontWeight="800" color={TEXT_PRIMARY} letterSpacing="-0.02em">
                  Admin Panel
                </Text>
                <Text fontSize="13px" color={TEXT_MUTED} mt={1}>
                  Drill into users, sessions, report summaries, and prompt validation from one place.
                </Text>
              </Box>
              <Badge colorPalette="red" borderRadius="999px" px={3} py={1}>
                Admin
              </Badge>
            </Flex>

            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(2, 1fr)" }} gap={4}>
              <StatCard label="Total Users" value={totals.users} accent={ACCENT} />
              <StatCard label="Total Sessions" value={totals.sessions} />
            </Grid>

            <PanelTabs value={tab} onChange={setTab} />

            {tab === "users" ? (
              <UsersPane onTotals={totalsHandler} />
            ) : (
              <SessionsPane onTotals={totalsHandler} />
            )}
          </Stack>
        ) : null}

        {userId ? <UserDetailPane userId={userId} /> : null}
        {sessionId ? <SessionDetailPane sessionId={sessionId} /> : null}
      </Box>
    </Box>
  );
}
