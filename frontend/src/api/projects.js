import api from "./axios";

export const projectsAPI = {
  list: () => api.get("/api/projects"),
  get: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post("/api/projects", data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  remove: (id) => api.delete(`/api/projects/${id}`),

  listMembers: (id) => api.get(`/api/projects/${id}/members`),
  addMember: (id, data) => api.post(`/api/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/api/projects/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) =>
    api.patch(`/api/projects/${id}/members/${userId}/role`, { role }),
};