import type { ReactNode } from "react";
import "./devices.css";

export function PhoneFrame({
  view,
  children,
}: {
  view: string;
  children: ReactNode;
}) {
  return (
    <div
      className="care-phone"
      data-phone-view={view}
      aria-label="Caregiver phone interface"
    >
      <div className="phone-island" aria-hidden="true" />
      <div className="care-phone-screen" data-view={view}>
        {children}
      </div>
    </div>
  );
}
