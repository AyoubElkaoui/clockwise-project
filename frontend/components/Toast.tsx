// components/Toast.tsx
"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <XCircle className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200";
      case "error":
        return "bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200";
      case "info":
        return "bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200";
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slide-in-right`}>
      <div
        className={`
          flex items-center gap-3 min-w-[320px] max-w-md p-4 
          border-l-4 rounded-lg shadow-lg backdrop-blur-sm
          ${getStyles()}
        `}
      >
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 font-medium">{message}</div>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toast Container voor multiple toasts
interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
