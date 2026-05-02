import api from "./axios";

export const dashboardAPI = {
  global: () => api.get("/api/dashboard"),
  forProject: (id) => api.get(`/api/projects/${id}/dashboard`),
};