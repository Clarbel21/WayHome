import type { HTMLAttributes } from "react";
import "./watch.css";

/** Layout only: task priority and decisions stay with Wearable and the stores. */
export function WatchScreen({
  variant,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant: "home" | "question" | "guidance" | "waiting" | "urgent" | "detail";
}) {
  return (
    <div
      {...props}
      data-watch-template={variant}
      className={`watch-template watch-template-${variant} ${className}`}
    />
  );
}
