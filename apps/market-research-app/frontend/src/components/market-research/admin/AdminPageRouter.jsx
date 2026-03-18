import { SessionDetailPane, UserDetailPane } from "./AdminDetailPanes";

export function AdminDetailPaneRouter({ userId, sessionId, navigate }) {
  if (userId) {
    return <UserDetailPane userId={userId} navigate={navigate} />;
  }

  if (sessionId) {
    return <SessionDetailPane sessionId={sessionId} navigate={navigate} />;
  }

  return null;
}
