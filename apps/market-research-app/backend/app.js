import express from "express";
import { configureApp } from "./infrastructure/http/configure-app.js";

export function createHttpApp({
  app = express(),
  isAllowedOrigin,
  taskQueue,
  marketResearchRepository,
  subscriptionService,
  userRepository,
  orchestrator,
}) {
  configureApp({
    app,
    isAllowedOrigin,
    taskQueue,
    marketResearchRepository,
    subscriptionService,
    userRepository,
    orchestrator,
  });

  return app;
}
