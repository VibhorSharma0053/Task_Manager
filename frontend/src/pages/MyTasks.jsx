import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, AlertOctagon, Calendar, Folder } from "lucide-react";
import { tasksAPI } from "../api/tasks";
import Loader from "../components/Loader";
import Badge, { statusVariant, priorityVariant } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { formatDate } from "../utils/format";

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = filter !== "ALL" ? { status: filter } : {};
      const res = await tasksAPI.myTasks(params);
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); /* eslint-disable-next-line */ }, [filter]);

  const handleStatusChange = async (id, status) => {
    try { await tasksAPI.updateStatus(id, status); fetchTasks(); }
    catch (err) { alert(err.response?.data?.detail || "Failed"); }
  };

  const labels = { ALL: "All Tasks", TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Completed" };

  // counts per status
  const counts = {
    ALL: tasks.length,
    TODO: tasks.filter(t => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter(t => t.status === "IN_PROGRESS").length,
    DONE: tasks.filter(t => t.status === "DONE").length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500 mt-1">Tasks assigned to you across all projects</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["ALL", "TODO", "IN_PROGRESS", "DONE"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition flex items-center gap-2 ${
              filter === f
                ? "bg-brand-600 text-white shadow-soft"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
            }`}
          >
            {labels[f]}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              filter === f ? "bg-white/20" : "bg-gray-100"
            }`}>
              {counts[f] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <Loader />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing to do here"
          description={
            filter === "ALL"
              ? "You don't have any tasks assigned yet."
              : `No tasks in "${labels[filter]}" status.`
          }
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 shadow-soft border border-gray-100 hover:border-brand-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/projects/${task.project_id}`}
                      className="font-bold text-gray-900 hover:text-brand-700 truncate"
                    >
                      {task.title}
                    </Link>
                    {task.is_overdue && (
                      <Badge variant="red">
                        <AlertOctagon className="w-3 h-3 mr-0.5 inline" /> Overdue
                      </Badge>
                    )}
                    <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 line-clamp-1 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5" /> {task.project_name}
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  className="text-sm px-3 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}