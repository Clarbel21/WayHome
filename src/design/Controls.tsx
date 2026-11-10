import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      {...props}
      data-variant={variant}
      className={`wh-button ${className}`}
    />
  );
}
export function IconButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      type="button"
      {...props}
      className={`wh-icon-button ${className}`}
    />
  );
}
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`wh-card ${className}`} />;
}
export function Status({
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={`wh-status ${className}`} />;
}
