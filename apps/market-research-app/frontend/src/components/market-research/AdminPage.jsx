import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { AdminDetailPaneRouter } from "./admin/AdminPageRouter";
import { PanelTabs, StatCard } from "./admin/AdminShared";
import { BG, ACCENT, TEXT_MUTED, TEXT_PRIMARY } from "./admin/admin-theme";
import { SessionsPane, UsersPane } from "./admin/AdminListPanes";

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
              <UsersPane onTotals={totalsHandler} navigate={navigate} />
            ) : (
              <SessionsPane onTotals={totalsHandler} navigate={navigate} />
            )}
          </Stack>
        ) : (
          <AdminDetailPaneRouter userId={userId} sessionId={sessionId} navigate={navigate} />
        )}
      </Box>
    </Box>
  );
}
