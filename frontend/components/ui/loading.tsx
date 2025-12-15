export function LoadingSpinner({
  size = "default",
  className,
}: {
  size?: "small" | "default" | "large";
  className?: string;
}) {
  const sizeClasses = {
    small: "h-6 w-6 border-2",
    default: "h-12 w-12 border-3",
    large: "h-16 w-16 border-4",
  };

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className || ""}`}
      ></div>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
      <span>Laden...</span>
    </div>
  );
}

export function PageLoader({
  message = "Gegevens laden...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}
