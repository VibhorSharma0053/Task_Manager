import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ListChecks,
  Clock,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { dashboardAPI } from "../api/dashboard";
import Loader from "../components/Loader";
import Badge, { statusVariant, priorityVariant } from "../components/Badge";
import { formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = { TODO: "#9ca3af", IN_PROGRESS: "#6366f1", DONE: "#10b981" };
const PRIORITY_COLORS = { LOW: "#9ca3af", MEDIUM: "#f59e0b", HIGH: "#ef4444" };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.global().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullScreen />;
  if (!data) return null;

  const stats = [
    { label: "Active Projects", value: data.projects_count, icon: Briefcase, color: "from-brand-500 to-brand-700" },
    { label: "Total Tasks", value: data.total_tasks, icon: ListChecks, color: "from-violet-500 to-purple-700" },
    { label: "Assigned to Me", value: data.my_tasks_count, icon: Clock, color: "from-amber-500 to-orange-600" },
    { label: "Overdue", value: data.overdue_count, icon: AlertOctagon, color: "from-rose-500 to-red-600" },
    { label: "Completed", value: data.completed_count, icon: CheckCircle2, color: "from-emerald-500 to-green-600" },
  ];

  const statusData = Object.entries(data.status_breakdown).map(([k, v]) => ({
    name: k.replace("_", " "),
    value: v,
    key: k,
  }));

  const priorityData = Object.entries(data.priority_breakdown).map(([k, v]) => ({
    name: k,
    value: v,
    key: k,
  }));

  const totalStatus = statusData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-1">Welcome back, {user?.name?.split(" ")[0]} 👋</p>
        <h1 className="text-3xl font-bold text-gray-900">Workspace Overview</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status donut */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Tasks by Status</h3>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          {totalStatus === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority bar */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-900 mb-4">Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityData.map((entry) => (
                  <Cell key={entry.key} fill={PRIORITY_COLORS[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityList title="Recent Tasks" emptyText="No tasks yet" tasks={data.recent_tasks} />
        <ActivityList title="Due This Week" emptyText="Nothing due soon" tasks={data.upcoming_tasks} />
      </div>
    </div>
  );
}

function ActivityList({ title, tasks, emptyText }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Link
              key={t.id}
              to={`/projects/${t.project_id}`}
              className="block p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-medium text-gray-900 text-sm flex-1 truncate">{t.title}</p>
                <Badge variant={statusVariant(t.status)}>{t.status.replace("_", " ")}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t.project_name}</span>
                {t.due_date && <span>{formatDate(t.due_date)}</span>}
              </div>
              {t.is_overdue && <Badge variant="red">Overdue</Badge>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}