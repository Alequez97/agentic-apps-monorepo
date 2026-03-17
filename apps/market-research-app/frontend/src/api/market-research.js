import client from "./client";

export const getAnalysisHistory = (reportId) =>
  client.get("/market-research", { params: reportId ? { reportId } : {} });

export const saveMarketResearchReport = (reportId, idea, state) =>
  client.put(`/market-research/${reportId}`, { idea, state });

export const requestMarketResearchAnalysis = (
  reportId,
  idea,
  numCompetitors,
  regions,
) =>
  client.post(`/market-research/${reportId}/analyze`, {
    idea,
    numCompetitors,
    regions: regions ?? null,
  });

export const getMarketResearchReport = (reportId) =>
  client.get(`/market-research/${reportId}/report`);

export const getCompetitorDetails = (reportId, competitorId) =>
  client.get(`/market-research/${reportId}/competitors/${competitorId}`);

export const restartMarketResearchAnalysis = (reportId, idea, regions) =>
  client.post(`/market-research/${reportId}/analyze`, {
    idea,
    regions: regions ?? null,
  });
