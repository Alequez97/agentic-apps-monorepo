import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { getUsers, getSessions } from "../../api/admin";
import { Badge, Box, Button, Flex, HStack, Spinner, Table, Tabs, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG = "#f8fafc";
const CARD_BG = "#ffffff";
const BORDER = "#e2e8f0";
const TH_BG = "#f8fafc";
const TEXT_PRIMARY = "#0f172a";
const TEXT_SECONDARY = "#64748b";
const TEXT_MUTED = "#94a3b8";
const ACCENT = "#6366f1";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <Box
      flex="1"
      minW="140px"
      bg={CARD_BG}
      border="1px solid"
      borderColor={BORDER}
      borderRadius="12px"
      px={5}
      py={4}
    >
      <Text
        fontSize="11px"
        fontWeight="600"
        color={TEXT_MUTED}
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={1}
      >
        {label}
      </Text>
      <Text fontSize="26px" fontWeight="800" color={accent || TEXT_PRIMARY} letterSpacing="-0.02em">
        {value ?? "—"}
      </Text>
    </Box>
  );
}

// ─── Table wrapper card ───────────────────────────────────────────────────────
function TableCard({ children }) {
  return (
    <Box
      bg={CARD_BG}
      border="1px solid"
      borderColor={BORDER}
      borderRadius="12px"
      overflow="hidden"
      mt={4}
    >
      {children}
    </Box>
  );
}

// ─── Column header ────────────────────────────────────────────────────────────
function TH({ children }) {
  return (
    <Table.ColumnHeader
      bg={TH_BG}
      fontWeight="600"
      color={TEXT_MUTED}
      fontSize="11px"
      textTransform="uppercase"
      letterSpacing="0.06em"
      py={3}
      px={4}
      borderBottom="1px solid"
      borderColor={BORDER}
    >
      {children}
    </Table.ColumnHeader>
  );
}

// ─── Table pagination ─────────────────────────────────────────────────────────
function TablePager({ page, totalPages, onChange }) {
  return (
    <Flex align="center" justify="space-between" mt={4} px={1}>
      <Text fontSize="13px" color={TEXT_MUTED}>
        Page{" "}
        <Text as="span" fontWeight="700" color={TEXT_PRIMARY}>
          {page}
        </Text>{" "}
        of {totalPages}
      </Text>
      <HStack gap={2}>
        <Button
          size="sm"
          variant="outline"
          disabled={page === 1}
          onClick={() => onChange(Math.max(1, page - 1))}
          borderColor={BORDER}
          color={TEXT_SECONDARY}
        >
          ← Prev
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page === totalPages}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          borderColor={BORDER}
          color={TEXT_SECONDARY}
        >
          Next →
        </Button>
      </HStack>
    </Flex>
  );
}

// ─── UsersTable ───────────────────────────────────────────────────────────────
function UsersTable({ onTotals }) {
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
  }, [page]);

  return (
    <Box>
      <TableCard>
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner color={ACCENT} />
          </Flex>
        ) : users.length === 0 ? (
          <Flex justify="center" py={12}>
            <Text color={TEXT_MUTED} fontSize="14px">
              No users found
            </Text>
          </Flex>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Plan</TH>
                <TH>Credits</TH>
                <TH>Last Seen</TH>
                <TH>Role</TH>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((user) => (
                <Table.Row key={user.userId} _hover={{ bg: "#f1f5f9" }}>
                  <Table.Cell px={4} py={3} fontWeight="600" color={TEXT_PRIMARY} fontSize="13px">
                    {user.name || "—"}
                  </Table.Cell>
                  <Table.Cell px={4} py={3} color={TEXT_SECONDARY} fontSize="13px">
                    {user.email}
                  </Table.Cell>
                  <Table.Cell px={4} py={3}>
                    <Badge
                      colorPalette={user.plan === "pro" ? "purple" : "gray"}
                      borderRadius="6px"
                      px={2}
                      fontSize="11px"
                      fontWeight="700"
                      textTransform="uppercase"
                    >
                      {user.plan}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell px={4} py={3} fontSize="13px">
                    <Text as="span" fontWeight="700" color={TEXT_PRIMARY}>
                      {user.creditsRemaining}
                    </Text>
                    <Text as="span" color={TEXT_MUTED}>
                      {" "}
                      / {user.creditsTotal}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={3} fontSize="12px" color={TEXT_MUTED}>
                    {fmtDate(user.lastSeenAt)}
                  </Table.Cell>
                  <Table.Cell px={4} py={3}>
                    {user.isAdmin ? (
                      <Badge
                        colorPalette="red"
                        borderRadius="6px"
                        px={2}
                        fontSize="11px"
                        fontWeight="700"
                        textTransform="uppercase"
                      >
                        Admin
                      </Badge>
                    ) : (
                      <Text fontSize="12px" color={TEXT_MUTED}>
                        —
                      </Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </TableCard>
      {!loading && pagination.totalPages > 1 && (
        <TablePager page={page} totalPages={pagination.totalPages} onChange={setPage} />
      )}
    </Box>
  );
}

// ─── SessionsTable ────────────────────────────────────────────────────────────
function SessionsTable({ onTotals }) {
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
  }, [page]);

  const statusColor = (s) =>
    s === "complete"
      ? "green"
      : s === "failed" || s === "validation_failed"
        ? "red"
        : s === "analyzing"
          ? "blue"
          : "gray";

  return (
    <Box>
      <TableCard>
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner color={ACCENT} />
          </Flex>
        ) : sessions.length === 0 ? (
          <Flex justify="center" py={12}>
            <Text color={TEXT_MUTED} fontSize="14px">
              No sessions found
            </Text>
          </Flex>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <TH>Idea</TH>
                <TH>Status</TH>
                <TH>Competitors</TH>
                <TH>Validation</TH>
                <TH>Created</TH>
                <TH>Error</TH>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sessions.map((session) => {
                const pv = session.state?.promptValidation;
                return (
                  <Table.Row key={session.sessionId} _hover={{ bg: "#f1f5f9" }}>
                    <Table.Cell px={4} py={3} maxW="240px" truncate title={session.idea}>
                      <Text fontSize="13px" color={TEXT_PRIMARY} fontWeight="500">
                        {session.idea}
                      </Text>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Badge
                        colorPalette={statusColor(session.state?.status)}
                        borderRadius="6px"
                        px={2}
                        fontSize="11px"
                        fontWeight="700"
                        textTransform="uppercase"
                      >
                        {session.state?.status || "pending"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell px={4} py={3} fontSize="13px" color={TEXT_SECONDARY}>
                      {session.state?.competitorCount ?? 0}
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      {pv ? (
                        <Badge
                          colorPalette={pv.shouldContinue ? "green" : "red"}
                          borderRadius="6px"
                          px={2}
                          fontSize="11px"
                          fontWeight="700"
                          textTransform="uppercase"
                        >
                          {pv.shouldContinue ? "Passed" : "Rejected"}
                        </Badge>
                      ) : (
                        <Text fontSize="12px" color={TEXT_MUTED}>
                          —
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell px={4} py={3} fontSize="12px" color={TEXT_MUTED}>
                      {fmtDate(session.createdAt)}
                    </Table.Cell>
                    <Table.Cell px={4} py={3} maxW="200px" truncate title={session.state?.error}>
                      {session.state?.error ? (
                        <Text fontSize="12px" color="#ef4444">
                          {session.state.error}
                        </Text>
                      ) : (
                        <Text fontSize="12px" color={TEXT_MUTED}>
                          —
                        </Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </TableCard>
      {!loading && pagination.totalPages > 1 && (
        <TablePager page={page} totalPages={pagination.totalPages} onChange={setPage} />
      )}
    </Box>
  );
}

// ─── PromptValidationsTable ───────────────────────────────────────────────────
function PromptValidationsTable() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  useEffect(() => {
    setLoading(true);
    getSessions(page, 100)
      .then((res) => {
        const withValidation = res.data.data.filter((s) => s.state?.promptValidation);
        setSessions(withValidation);
        setPagination(res.data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Box>
      <TableCard>
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner color={ACCENT} />
          </Flex>
        ) : sessions.length === 0 ? (
          <Flex justify="center" py={12}>
            <Text color={TEXT_MUTED} fontSize="14px">
              No prompt validation records found
            </Text>
          </Flex>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <TH>Idea</TH>
                <TH>Result</TH>
                <TH>Rejection Reason</TH>
                <TH>Suggested Prompt</TH>
                <TH>Validated At</TH>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sessions.map((session) => {
                const pv = session.state.promptValidation;
                return (
                  <Table.Row key={session.sessionId} _hover={{ bg: "#f1f5f9" }}>
                    <Table.Cell px={4} py={3} maxW="220px" truncate title={session.idea}>
                      <Text fontSize="13px" color={TEXT_PRIMARY} fontWeight="500">
                        {session.idea}
                      </Text>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Badge
                        colorPalette={pv.shouldContinue ? "green" : "red"}
                        borderRadius="6px"
                        px={2}
                        fontSize="11px"
                        fontWeight="700"
                        textTransform="uppercase"
                      >
                        {pv.shouldContinue ? "Passed" : "Rejected"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      {pv.rejectionReason ? (
                        <Badge
                          colorPalette="orange"
                          borderRadius="6px"
                          px={2}
                          fontSize="11px"
                          fontWeight="600"
                          textTransform="uppercase"
                        >
                          {pv.rejectionReason}
                        </Badge>
                      ) : (
                        <Text fontSize="12px" color={TEXT_MUTED}>
                          —
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell px={4} py={3} maxW="280px" truncate title={pv.suggestedPrompt}>
                      {pv.suggestedPrompt ? (
                        <Text fontSize="12px" color={ACCENT} fontStyle="italic">
                          {pv.suggestedPrompt}
                        </Text>
                      ) : (
                        <Text fontSize="12px" color={TEXT_MUTED}>
                          —
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell px={4} py={3} fontSize="12px" color={TEXT_MUTED}>
                      {fmtDate(pv.validatedAt)}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </TableCard>
      {!loading && pagination.totalPages > 1 && (
        <TablePager page={page} totalPages={pagination.totalPages} onChange={setPage} />
      )}
    </Box>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────
export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [totals, setTotals] = useState({ users: null, sessions: null });

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || !user.isAdmin) return null;

  return (
    <Box minH="100vh" bg={BG} pt="116px" pb="80px">
      <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Header */}
        <Flex align="center" justify="space-between" mb={6}>
          <Box>
            <Text fontSize="22px" fontWeight="800" color={TEXT_PRIMARY} letterSpacing="-0.02em">
              Admin Panel
            </Text>
            <Text fontSize="13px" color={TEXT_MUTED} mt={0.5}>
              Manage users, sessions and prompt quality.
            </Text>
          </Box>
          <Badge
            colorPalette="red"
            borderRadius="8px"
            px={3}
            py={1}
            fontSize="12px"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            Admin
          </Badge>
        </Flex>

        {/* Stats row */}
        <Flex gap={3} mb={6} flexWrap="wrap">
          <StatCard label="Total Users" value={totals.users} accent={ACCENT} />
          <StatCard label="Total Sessions" value={totals.sessions} />
        </Flex>

        {/* Tabs */}
        <Tabs.Root defaultValue="users">
          <Tabs.List borderBottom="2px solid" borderColor={BORDER} gap={0} bg="transparent">
            <Tabs.Trigger
              value="users"
              fontWeight="600"
              fontSize="14px"
              color={TEXT_SECONDARY}
              px={4}
              pb={3}
              _selected={{ color: TEXT_PRIMARY, borderBottom: `2px solid ${ACCENT}`, mb: "-2px" }}
            >
              Users
            </Tabs.Trigger>
            <Tabs.Trigger
              value="sessions"
              fontWeight="600"
              fontSize="14px"
              color={TEXT_SECONDARY}
              px={4}
              pb={3}
              _selected={{ color: TEXT_PRIMARY, borderBottom: `2px solid ${ACCENT}`, mb: "-2px" }}
            >
              Sessions
            </Tabs.Trigger>
            <Tabs.Trigger
              value="validations"
              fontWeight="600"
              fontSize="14px"
              color={TEXT_SECONDARY}
              px={4}
              pb={3}
              _selected={{ color: TEXT_PRIMARY, borderBottom: `2px solid ${ACCENT}`, mb: "-2px" }}
            >
              Prompt Validations
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="users" pt={2}>
            <UsersTable onTotals={(t) => setTotals((prev) => ({ ...prev, ...t }))} />
          </Tabs.Content>
          <Tabs.Content value="sessions" pt={2}>
            <SessionsTable onTotals={(t) => setTotals((prev) => ({ ...prev, ...t }))} />
          </Tabs.Content>
          <Tabs.Content value="validations" pt={2}>
            <PromptValidationsTable />
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
}
