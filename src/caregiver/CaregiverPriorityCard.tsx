import { useZone } from "../zone/store";
import { useRef } from "react";
import { ShieldAlert, MessageCircle, ArrowRight } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../i18n";
import { ResolveSOSButton } from "../components/ResolveSOSButton";
import { selectCaregiverPriority } from "./priority";
import "./caregiver.css";

export function CaregiverPriorityCard({
  onCheckIn,
  onReview,
}: {
  onCheckIn: () => void;
  onReview: () => void;
}) {
  const s = useStore(),
    t = useT();
  const p = selectCaregiverPriority(s, useZone());
  const heading = useRef<HTMLHeadingElement>(null);
  const first = s.settings.wearer.split(" ")[0];
  const titles = {
    "sos-new": "prioritySos",
    "sos-review": "prioritySosActive",
    "family-new": "priorityFamily",
    "family-reply": "priorityFamilyReply",
    "family-done": "priorityFamilyDone",
    checkin: "priorityCheckin",
    guidance: "priorityGuidance",
    review: "priorityReview",
    clear: "priorityClear",
    zone: "zoneOutside",
  };
  const details = {
    "sos-new": "prioritySosBody",
    "sos-review": "prioritySosReviewBody",
    "family-new": "priorityFamilyBody",
    "family-reply": "priorityFamilyReplyBody",
    "family-done": "priorityFamilyDoneBody",
    checkin: "priorityCheckinBody",
    guidance: "priorityGuidanceBody",
    review: "priorityReviewBody",
    clear: "priorityClearBody",
    zone: "priorityZoneBody",
  };
  return (
    <section
      className={`care-priority tone-${p.tone}`}
      aria-label={t("priorityLabel")}
      data-priority={p.kind}
    >
      <span className="care-priority-context">
        {p.tone === "urgent" ? (
          <ShieldAlert size={18} aria-hidden="true" />
        ) : (
          <MessageCircle size={18} aria-hidden="true" />
        )}
        <span>
          {t(
            p.tone === "urgent"
              ? "urgent"
              : p.tone === "attention"
                ? "needsAttention"
                : "priorityLabel",
          )}
        </span>
        {(p.kind.startsWith("sos") || p.kind.startsWith("family")) &&
          (p.emergency?.time || s.familyRequest?.requestedAt) && (
            <time
              dateTime={new Date(
                p.emergency?.time ?? s.familyRequest!.requestedAt,
              ).toISOString()}
            >
              {new Date(
                p.emergency?.time ?? s.familyRequest!.requestedAt,
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          )}
      </span>
      <h3 ref={heading} tabIndex={-1}>
        {t(titles[p.kind], { name: first })}
      </h3>
      <p>
        {t(details[p.kind], {
          name: first,
          place: p.landmark?.name ?? t("noLandmarks"),
        })}
      </p>
      {p.kind === "clear" && s.checkIn?.respondedAt && (
        <small>
          {t("priorityLastAnswer")}{" "}
          {new Date(s.checkIn.respondedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </small>
      )}
      {p.kind === "sos-new" && p.emergency && (
        <button
          className="wh-button"
          onClick={() => s.acknowledgeEmergency(p.emergency!.id)}
        >
          {t("ackSos")}
        </button>
      )}
      {p.kind === "sos-review" && (
        <ResolveSOSButton
          label={t("priorityResolve")}
          className="wh-button"
          onResolved={() =>
            requestAnimationFrame(() => heading.current?.focus())
          }
        />
      )}
      {p.kind === "family-new" && (
        <button
          className="wh-button"
          onClick={() => s.respondFamily(s.familyRequest!.id, "acknowledge")}
        >
          {t("ackFamily")}
        </button>
      )}
      {p.kind === "family-reply" && (
        <button
          className="wh-button"
          onClick={() => s.respondFamily(s.familyRequest!.id, "respond")}
        >
          {t("respondFamily")}
        </button>
      )}
      {p.kind === "clear" && (
        <button className="wh-button" onClick={onCheckIn}>
          {t("sendCheckIn")}
        </button>
      )}
      {(p.kind === "review" ||
        p.kind === "zone" ||
        (p.kind === "sos-new" && !p.emergency)) && (
        <button className="wh-button" onClick={onReview}>
          {t("reviewDetails")}
          <ArrowRight size={18} />
        </button>
      )}
      {p.concerns > 0 && p.kind !== "review" && (
        <button className="care-concerns" onClick={onReview}>
          {t("otherConcerns", { n: p.concerns })}
        </button>
      )}
    </section>
  );
}
