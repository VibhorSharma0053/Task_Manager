export default function Badge({ children, variant = "gray" }) {
  const variants = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-brand-100 text-brand-700",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    purple: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function statusVariant(status) {
  return { TODO: "gray", IN_PROGRESS: "blue", DONE: "green" }[status] || "gray";
}

export function priorityVariant(priority) {
  return { LOW: "gray", MEDIUM: "yellow", HIGH: "red" }[priority] || "gray";
}