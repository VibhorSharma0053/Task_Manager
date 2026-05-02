import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, Users, Crown, Search } from "lucide-react";
import { projectsAPI } from "../api/projects";
import Loader from "../components/Loader";
import Button from "../components/Button";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import { formatDate } from "../utils/format";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectsAPI.list();
      setProjects(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">All projects across your workspace</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
        />
      </div>

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search ? "No matching projects" : "No projects yet"}
          description={search ? "Try a different search term." : "Create your first project to get started."}
          action={!search && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Create Project
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group bg-white rounded-2xl p-5 shadow-soft border border-gray-100 hover:border-brand-300 hover:shadow-glow transition relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-50 to-transparent rounded-full -translate-y-16 translate-x-16 opacity-0 group-hover:opacity-100 transition"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  {p.my_role === "ADMIN" && (
                    <Badge variant="purple">
                      <Crown className="w-3 h-3 mr-1 inline" /> Admin
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">
                  {p.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {p.members_count} member{p.members_count !== 1 && "s"}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(p.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal isOpen={showModal} onClose={() => setShowModal(false)} onCreated={fetchProjects} />
    </div>
  );
}

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setName(""); setDescription(""); setError(""); onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await projectsAPI.create({ name, description });
      onCreated(); handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Name *</label>
          <input
            required minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="e.g. Mobile App Launch"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none"
            placeholder="Brief description of the project..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}