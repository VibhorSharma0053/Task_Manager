import { useEffect, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { tasksAPI } from "../api/tasks";
import { toInputDate } from "../utils/format";

export default function TaskModal({ isOpen, onClose, projectId, members, task, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: "", description: "", status: "TODO", priority: "MEDIUM", due_date: "", assignee_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "TODO",
        priority: task.priority || "MEDIUM",
        due_date: toInputDate(task.due_date),
        assignee_id: task.assignee_id || "",
      });
    } else {
      setForm({ title: "", description: "", status: "TODO", priority: "MEDIUM", due_date: "", assignee_id: "" });
    }
    setError("");
  }, [task, isOpen]);

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        assignee_id: form.assignee_id || null,
      };
      if (isEdit) await tasksAPI.update(task.id, payload);
      else await tasksAPI.create(projectId, payload);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Task" : "Create New Task"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
          <input
            required minLength={2}
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className={inputCls}
            placeholder="What needs to be done?"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Add more details..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => handleChange("status", e.target.value)} className={inputCls}>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => handleChange("priority", e.target.value)} className={inputCls}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => handleChange("due_date", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assignee</label>
            <select value={form.assignee_id} onChange={(e) => handleChange("assignee_id", e.target.value)} className={inputCls}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? "Save Changes" : "Create Task"}</Button>
        </div>
      </form>
    </Modal>
  );
}