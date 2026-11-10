import type { HTMLAttributes, ReactNode, Ref } from "react";
import { SOSButton } from "../SOSButton";
import "./devices.css";

/** Geometry belongs to the device, independently of its current task. */
export function WatchFrame({
  children,
  status,
  footer,
  overlay,
  caseRef,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  status: ReactNode;
  footer: ReactNode;
  overlay?: ReactNode;
  caseRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      {...props}
      className={`watch-area fixed-watch companion-watch ${className}`}
    >
      <div className="watch-strap top" aria-hidden="true" />
      <div className="watch" ref={caseRef}>
        <div className="watch-sos-side">
          <SOSButton />
        </div>
        <div className="watch-screen wos">
          {status}
          {children}
          <div className="wos-footer">{footer}</div>
          {overlay}
        </div>
      </div>
      <div className="watch-strap bottom" aria-hidden="true" />
    </div>
  );
}
