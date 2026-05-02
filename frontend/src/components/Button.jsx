import { Loader2 } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  ...props
}) {
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-soft",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    accent: "bg-accent-500 hover:bg-accent-600 text-white",
    ghost: "hover:bg-gray-100 text-gray-700",
    outline: "border-2 border-gray-200 hover:border-brand-500 hover:text-brand-700 text-gray-700",
  };
  const sizes = {
    sm: "px-3.5 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-full transition disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}