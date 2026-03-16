import client from "./client";

export const signInWithGoogle = (credential) =>
  client.post("/auth/google", { credential }, { withCredentials: true });

export const getAuthMe = () =>
  client.get("/auth/me", { withCredentials: true });

export const logout = () =>
  client.post("/auth/logout", {}, { withCredentials: true });

export const claimSession = (sessionId) =>
  client.post(
    `/market-research/${sessionId}/claim`,
    {},
    { withCredentials: true },
  );
