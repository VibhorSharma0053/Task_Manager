export default function Loader({ fullScreen = false }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-brand-100"></div>
        <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin"></div>
      </div>
      <p className="text-xs text-gray-400">Loading...</p>
    </div>
  );
  if (fullScreen) return <div className="flex items-center justify-center min-h-[60vh]">{spinner}</div>;
  return <div className="flex items-center justify-center py-16">{spinner}</div>;
}