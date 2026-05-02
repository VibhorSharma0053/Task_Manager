import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 mb-4">
        <Icon className="w-8 h-8 text-brand-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {description && <p className="text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}