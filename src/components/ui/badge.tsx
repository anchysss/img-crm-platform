import { cn } from "@/lib/utils";

const tone = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  danger: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  info: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
};

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: keyof typeof tone }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone[variant])}>{children}</span>;
}
