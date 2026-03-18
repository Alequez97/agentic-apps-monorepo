import client from "./client";

export async function getUsers(page = 1, limit = 50) {
  return client.get(`/admin/users`, { params: { page, limit } });
}

export async function getSessions(page = 1, limit = 50) {
  return client.get(`/admin/sessions`, { params: { page, limit } });
}
