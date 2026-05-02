import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, Crown, UserPlus, AlertOctagon,
  Calendar, User as UserIcon, ListFilter,
} from "lucide-react";
import { projectsAPI } from "../api/projects";
import { tasksAPI } from "../api/tasks";
import Loader from "../components/Loader";
import Button from "../components/Button";
import Badge, { statusVariant, priorityVariant } from "../components/Badge";
import Modal from "../components/Modal";
import TaskModal from "../components/TaskModal";
import EmptyState from "../components/EmptyState";
import { formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("tasks");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [memberModal, setMemberModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isAdmin = project?.my_role === "ADMIN";
  const isOwner = project && project.owner_id === user?.id;

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, mRes, tRes] = await Promise.all([
        projectsAPI.get(id),
        projectsAPI.listMembers(id),
        tasksAPI.listForProject(id),
      ]);
      setProject(pRes.data); setMembers(mRes.data); setTasks(tRes.data);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (taskId, status) => {
    try { await tasksAPI.updateStatus(taskId, status); fetchAll(); }
    catch (err) { alert(err.response?.data?.detail || "Failed"); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    await tasksAPI.remove(taskId); fetchAll();
  };

  const handleDeleteProject = async () => {
    await projectsAPI.remove(id); navigate("/projects");
  };

  if (loading) return <Loader fullScreen />;
  if (!project) return null;

  const filteredTasks = statusFilter === "ALL" ? tasks : tasks.filter((t) => t.status === statusFilter);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {isAdmin && (
              <Badge variant="purple"><Crown className="w-3 h-3 mr-1 inline" /> Admin</Badge>
            )}
          </div>
          <p className="text-gray-500">{project.description || "No description"}</p>
        </div>
        {isOwner && (
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" /> Delete Project
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-full w-fit">
        <TabPill active={tab === "tasks"} onClick={() => setTab("tasks")}>
          Tasks ({tasks.length})
        </TabPill>
        <TabPill active={tab === "members"} onClick={() => setTab("members")}>
          Members ({members.length})
        </TabPill>
      </div>

      {tab === "tasks" ? (
        <>
          {/* Filter row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <ListFilter className="w-4 h-4 text-gray-400" />
              {["ALL", "TODO", "IN_PROGRESS", "DONE"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    statusFilter === s
                      ? "bg-brand-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
            {isAdmin && (
              <Button onClick={() => setTaskModal({ open: true, task: null })}>
                <Plus className="w-4 h-4" /> New Task
              </Button>
            )}
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description={isAdmin ? "Create one to get started." : "No tasks here yet."}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Task</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider hidden md:table-cell">Assignee</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider hidden lg:table-cell">Due Date</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Priority</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Status</th>
                      {isAdmin && <th className="text-right px-4 py-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTasks.map((task) => {
                      const isAssignee = task.assignee_id === user?.id;
                      const canChangeStatus = isAdmin || isAssignee;
                      return (
                        <tr key={task.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                                  {task.is_overdue && (
                                    <Badge variant="red">
                                      <AlertOctagon className="w-3 h-3 mr-0.5 inline" /> Overdue
                                    </Badge>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {task.assignee_name ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center text-xs font-bold">
                                  {task.assignee_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-700">{task.assignee_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {task.due_date ? (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(task.due_date)}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {canChangeStatus ? (
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className="text-xs px-2 py-1 border border-gray-200 rounded-full focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                              </select>
                            ) : (
                              <Badge variant={statusVariant(task.status)}>{task.status.replace("_", " ")}</Badge>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setTaskModal({ open: true, task })}
                                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <MembersTab
          members={members}
          projectId={id}
          isAdmin={isAdmin}
          ownerId={project.owner_id}
          onInvite={() => setMemberModal(true)}
          onChange={fetchAll}
        />
      )}

      {/* Modals */}
      <TaskModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null })}
        projectId={id}
        members={members}
        task={taskModal.task}
        onSaved={fetchAll}
      />
      <AddMemberModal
        isOpen={memberModal}
        onClose={() => setMemberModal(false)}
        projectId={id}
        onAdded={fetchAll}
      />
      <DeleteProjectModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
        name={project.name}
      />
    </div>
  );
}

function TabPill({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function MembersTab({ members, projectId, isAdmin, ownerId, onInvite, onChange }) {
  const handleRemove = async (userId) => {
    if (!confirm("Remove this member?")) return;
    try {
      await projectsAPI.removeMember(projectId, userId);
      onChange();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to remove");
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await projectsAPI.updateMemberRole(projectId, userId, role);
      onChange();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{members.length} members in this project</p>
        {isAdmin && (
          <Button onClick={onInvite}>
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-2xl p-4 shadow-soft border border-gray-100 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center text-lg font-bold shadow-soft">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 truncate">{m.name}</p>
                {m.user_id === ownerId && (
                  <Badge variant="purple">
                    <Crown className="w-3 h-3 mr-1 inline" /> Owner
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && m.user_id !== ownerId ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-full bg-white"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ) : (
                <Badge variant={m.role === "ADMIN" ? "purple" : "gray"}>{m.role}</Badge>
              )}
              {isAdmin && m.user_id !== ownerId && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AddMemberModal({ isOpen, onClose, projectId, onAdded }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await projectsAPI.addMember(projectId, { email, role });
      onAdded();
      setEmail(""); setRole("MEMBER");
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
          <input
            type="email" required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="member@company.com"
          />
          <p className="text-xs text-gray-500 mt-1">User must already have an account.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="MEMBER">Member — can view & update assigned tasks</option>
            <option value="ADMIN">Admin — full project access</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Send Invite</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteProjectModal({ isOpen, onClose, onConfirm, name }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Project" size="sm">
      <p className="text-sm text-gray-700 mb-2">
        Are you sure you want to delete <strong>{name}</strong>?
      </p>
      <p className="text-xs text-gray-500 mb-5">
        This will permanently delete all tasks and remove all members. This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handle} loading={loading}>Yes, Delete</Button>
      </div>
    </Modal>
  );
}