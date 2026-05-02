import api from "./axios";

export const tasksAPI = {
  listForProject: (projectId, params = {}) =>
    api.get(`/api/projects/${projectId}/tasks`, { params }),
  create: (projectId, data) =>
    api.post(`/api/projects/${projectId}/tasks`, data),

  myTasks: (params = {}) => api.get("/api/tasks/my", { params }),
  get: (id) => api.get(`/api/tasks/${id}`),
  update: (id, data) => api.put(`/api/tasks/${id}`, data),
  updateStatus: (id, status) =>
    api.patch(`/api/tasks/${id}/status`, { status }),
  remove: (id) => api.delete(`/api/tasks/${id}`),
};