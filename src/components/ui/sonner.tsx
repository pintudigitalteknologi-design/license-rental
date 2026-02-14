import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, CircleAlert, Info, Loader2 } from "lucide-react";
// Ensure lucide-react is installed since it's referenced here (X, Check, etc)
// If not installed, I might need to use generic SVGs or install it, but user didn't say so.
// Assuming lucide-react is available as per earlier messages.

type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"
  | "default";

export interface ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: ToastType;
  duration?: number;
  classNames?: {
    toast?: string;
    title?: string;
    description?: string;
    actionButton?: string;
    cancelButton?: string;
    closeButton?: string;
  };
  onDismiss?: (id: string) => void;
  visible?: boolean;
}

type ToastOptions = Omit<ToastProps, "id" | "visible" | "onDismiss">;

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;

// --- State Management (Simple Pub/Sub) ---

let toasts: ToastProps[] = [];
const listeners = new Set<(toasts: ToastProps[]) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toasts]));
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const toastDispatch = (action: {
  type: "ADD" | "UPDATE" | "DISMISS" | "REMOVE";
  payload?: any;
}) => {
  switch (action.type) {
    case "ADD":
      if (toasts.length >= TOAST_LIMIT) {
        // Remove oldest visible toast
        const oldestVisible = toasts.find((t) => t.visible !== false);
        if (oldestVisible) {
          toastDispatch({ type: "DISMISS", payload: { id: oldestVisible.id } });
        }
      }
      toasts = [action.payload, ...toasts];
      break;
    case "UPDATE":
      toasts = toasts.map((t) =>
        t.id === action.payload.id ? { ...t, ...action.payload.toast } : t,
      );
      break;
    case "DISMISS":
      toasts = toasts.map((t) =>
        t.id === action.payload.id ? { ...t, visible: false } : t,
      );
      break;
    case "REMOVE":
      toasts = toasts.filter((t) => t.id !== action.payload.id);
      break;
  }
  notifyListeners();
};

// --- Toast Function ---

interface ToastT {
  (message: string | React.ReactNode, options?: ToastOptions): string;
  success: (
    message: string | React.ReactNode,
    options?: ToastOptions,
  ) => string;
  error: (message: string | React.ReactNode, options?: ToastOptions) => string;
  warning: (
    message: string | React.ReactNode,
    options?: ToastOptions,
  ) => string;
  info: (message: string | React.ReactNode, options?: ToastOptions) => string;
  loading: (
    message: string | React.ReactNode,
    options?: ToastOptions,
  ) => string;
  dismiss: (id?: string) => void;
  promise: <T>(
    promise: Promise<T>,
    data: {
      loading: string | React.ReactNode;
      success:
        | string
        | React.ReactNode
        | ((data: T) => string | React.ReactNode);
      error:
        | string
        | React.ReactNode
        | ((error: any) => string | React.ReactNode);
    },
    options?: ToastOptions,
  ) => Promise<T>;
}

const createToast = (
  message: string | React.ReactNode,
  type: ToastType = "default",
  options?: ToastOptions,
) => {
  const id = generateId();
  const duration = options?.duration ?? 4000;

  toastDispatch({
    type: "ADD",
    payload: {
      id,
      title: message,
      type,
      visible: true,
      ...options,
    },
  });

  if (type !== "loading" && duration !== Infinity) {
    setTimeout(() => {
      toast.dismiss(id);
    }, duration);
  }

  return id;
};

export const toast: ToastT = (message, options) =>
  createToast(message, "default", options);

toast.success = (message, options) => createToast(message, "success", options);
toast.error = (message, options) => createToast(message, "error", options);
toast.warning = (message, options) => createToast(message, "warning", options);
toast.info = (message, options) => createToast(message, "info", options);
toast.loading = (message, options) => createToast(message, "loading", options);

toast.dismiss = (id) => {
  if (id) {
    toastDispatch({ type: "DISMISS", payload: { id } });
    setTimeout(() => {
      toastDispatch({ type: "REMOVE", payload: { id } });
    }, TOAST_REMOVE_DELAY);
  } else {
    // Dismiss all
    toasts.forEach((t) => {
      toastDispatch({ type: "DISMISS", payload: { id: t.id } });
      setTimeout(() => {
        toastDispatch({ type: "REMOVE", payload: { id: t.id } });
      }, TOAST_REMOVE_DELAY);
    });
  }
};

toast.promise = async (promise, data, options) => {
  const id = toast.loading(data.loading, { ...options, duration: Infinity });

  try {
    const result = await promise;
    const message =
      typeof data.success === "function" ? data.success(result) : data.success;
    toast.dismiss(id);
    toast.success(message, options);
    return result;
  } catch (error) {
    const message =
      typeof data.error === "function" ? data.error(error) : data.error;
    toast.dismiss(id);
    toast.error(message, options);
    throw error; // Re-throw so caller can handle it too
  }
};

// --- Toast Component ---

const ToastItem = ({
  id,
  title,
  description,
  action,
  type,
  visible,
  classNames,
  onDismiss,
}: ToastProps) => {
  React.useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        onDismiss?.(id);
      }, 300); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss, id]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <CircleAlert className="h-5 w-5 text-red-500" />,
    warning: <CircleAlert className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    loading: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    default: null,
  };

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
        "bg-background text-foreground border-border", // Default styling based on sonner replacement
        visible
          ? "animate-in slide-in-from-bottom-5 fade-in duration-300"
          : "animate-out fade-out slide-out-to-right-5 duration-300",
        classNames?.toast,
      )}
      style={
        {
          // Simple stacking inline logic could go here if needed, but flex-col container handles it
        }
      }
      role="alert"
    >
      <div className="flex gap-3 items-start w-full">
        {type && type !== "default" && (
          <div className="mt-0.5 shrink-0">{icons[type]}</div>
        )}

        <div className="grid gap-1 flex-1">
          {title && (
            <div className={cn("text-sm font-semibold", classNames?.title)}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn("text-sm opacity-90", classNames?.description)}>
              {description}
            </div>
          )}
        </div>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
            classNames?.actionButton,
          )}
        >
          {action.label}
        </button>
      )}

      <button
        onClick={() => toast.dismiss(id)}
        className={cn(
          "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
          classNames?.closeButton,
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// --- Toaster Component ---

export function Toaster({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [activeToasts, setActiveToasts] = React.useState<ToastProps[]>([]);

  React.useEffect(() => {
    const handleToastsChange = (newToasts: ToastProps[]) => {
      setActiveToasts(newToasts);
    };
    listeners.add(handleToastsChange);
    return () => {
      listeners.delete(handleToastsChange);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2 pointer-events-none",
        props.className,
      )}
      {...props}
    >
      {activeToasts.map((toastProps) => (
        <ToastItem key={toastProps.id} {...toastProps} />
      ))}
    </div>
  );
}
