import client from "./client";

export const getTasks = (params = {}) => client.get("/tasks", { params });
