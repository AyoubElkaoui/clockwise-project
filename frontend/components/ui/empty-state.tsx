export function EmptyState({ 
  icon,
  title, 
  description, 
  action 
}: { 
  icon?: React.ReactNode;
  title: string; 
  description?: string; 
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">{description}</p>
      )}
      {action && (
        <button 
          onClick={action.onClick}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
