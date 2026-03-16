import client from "./client";

export const getAnalysisHistory = (sessionId) =>
  client.get("/market-research", { params: sessionId ? { sessionId } : {} });

export const saveMarketResearchSession = (sessionId, idea, state) =>
  client.put(`/market-research/${sessionId}`, { idea, state });

export const getMarketResearchSession = (sessionId) =>
  client.get(`/market-research/${sessionId}`);

export const requestMarketResearchAnalysis = (
  sessionId,
  idea,
  numCompetitors,
  regions,
) =>
  client.post(`/market-research/${sessionId}/analyze`, {
    idea,
    numCompetitors,
    regions: regions ?? null,
  });

export const getMarketResearchReport = (sessionId) =>
  client.get(`/market-research/${sessionId}/report`);

export const getCompetitorDetails = (sessionId, competitorId) =>
  client.get(`/market-research/${sessionId}/competitors/${competitorId}`);
