import { SafeZoneSettings } from "../zone/ZoneViews";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { CompanionPersonalization } from "../components/CompanionPersonalization";
import {
  useMediaURL,
  putMedia,
  validMedia,
  removeMedia,
} from "../memory/media";
import { useMemory } from "../memory/store";
import { useCare, type Contact, type Method, type Journey } from "./store";

function Avatar({ contact }: { contact: Contact }) {
  const { url } = useMediaURL(contact.photoId);
  return url ? (
    <img
      className="contact-photo"
      src={url}
      alt={`${contact.name}'s profile`}
    />
  ) : (
    <span className="phone-avatar">{contact.name[0]}</span>
  );
}
export function Contacts() {
  const care = useCare();
  const [editing, setEditing] = useState<Contact | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [file, setFile] = useState<File>(),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null);
  const open = (contact?: Contact) => {
    origin.current = document.activeElement as HTMLElement;
    setError("");
    setFile(undefined);
    setEditing(
      contact
        ? { ...contact }
        : {
            id: crypto.randomUUID(),
            name: "",
            relationship: "Family",
            countryCode: "+1",
            phone: "",
            preferred: "push",
            push: true,
            sms: false,
            call: false,
            primary: false,
            emergency: false,
            enabled: true,
          },
    );
    dialog.current?.showModal();
  };
  const close = () => {
    dialog.current?.close();
    setEditing(null);
    origin.current?.focus();
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError("");
    try {
      let photoId = editing.photoId;
      if (file) {
        validMedia(file, "image");
        photoId = crypto.randomUUID();
        await putMedia(photoId, file);
      }
      const message = care.saveContact({ ...editing, photoId });
      if (message) {
        setError(message);
        return;
      }
      setNotice(
        "Contact saved on this browser. Calling and messaging are simulations only.",
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="care-manager">
      <h2>Caregiver contacts</h2>
      <p>
        Fictional sample numbers. Permissions control simulated notifications
        only.
      </p>
      <button className="button" onClick={() => open()}>
        Add contact
      </button>
      <p role="status">{notice}</p>
      {care.contacts.map((c, i) => (
        <article className="contact-card" key={c.id}>
          <Avatar contact={c} />
          <h3>{c.name}</h3>
          <p>
            {c.relationship} · {c.phone}
          </p>
          <p>
            {c.primary ? "Primary caregiver" : "Secondary contact"} ·{" "}
            {c.enabled ? "Enabled" : "Temporarily disabled"} · Escalation order{" "}
            {i + 1}
          </p>
          <div className="button-row">
            <button className="button light" onClick={() => open(c)}>
              Edit {c.name}
            </button>
            <button
              className="button light"
              onClick={async () => {
                const error = care.deleteContact(c.id);
                setNotice(error ?? "Contact deleted.");
                if (!error && c.photoId)
                  await removeMedia(c.photoId).catch(() =>
                    setNotice(
                      "Contact deleted. An unused photo may remain in browser storage.",
                    ),
                  );
              }}
            >
              Delete {c.name}
            </button>
            <button
              aria-label={`Move ${c.name} earlier`}
              disabled={i === 0}
              title={
                i === 0 ? "Already first in escalation order" : "Move earlier"
              }
              onClick={() => care.reorderContact(c.id, -1)}
            >
              ↑ Earlier
            </button>
            <button
              aria-label={`Move ${c.name} later`}
              disabled={i === care.contacts.length - 1}
              title={
                i === care.contacts.length - 1
                  ? "Already last in escalation order"
                  : "Move later"
              }
              onClick={() => care.reorderContact(c.id, 1)}
            >
              ↓ Later
            </button>
          </div>
        </article>
      ))}
      <dialog
        ref={dialog}
        className="care-dialog"
        aria-labelledby="contact-editor-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        onClose={() => {
          setEditing(null);
          origin.current?.focus();
        }}
      >
        {editing && (
          <form onSubmit={save}>
            <h2 id="contact-editor-title">
              {care.contacts.some((c) => c.id === editing.id)
                ? "Edit contact"
                : "Add caregiver contact"}
            </h2>
            <fieldset disabled={busy}>
              {(
                [
                  ["name", "Name"],
                  ["relationship", "Relationship"],
                  ["countryCode", "Country code"],
                  ["phone", "Phone number"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={key !== "relationship"}
                    type={key === "phone" ? "tel" : "text"}
                    autoComplete="off"
                    value={editing[key]}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Optional profile photograph
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </label>
              <label>
                Preferred contact method
                <select
                  value={editing.preferred}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      preferred: e.target.value as Method,
                    })
                  }
                >
                  <option value="push">Simulated push</option>
                  <option value="sms">Simulated SMS</option>
                  <option value="call">Simulated call</option>
                </select>
              </label>
              {(
                [
                  ["push", "Allow simulated push"],
                  ["sms", "Allow simulated SMS"],
                  ["call", "Allow simulated calls"],
                  ["primary", "Primary caregiver"],
                  ["emergency", "Emergency contact"],
                  ["enabled", "Contact temporarily enabled"],
                ] as const
              ).map(([key, label]) => (
                <label className="check-label" key={key}>
                  <input
                    type="checkbox"
                    checked={editing[key]}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <p role="alert">{error}</p>
            <div className="button-row">
              <button className="button" disabled={busy} type="submit">
                {busy ? "Saving…" : "Save contact"}
              </button>
              <button
                className="button light"
                type="button"
                disabled={busy}
                onClick={close}
              >
                Cancel contact
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}
export function SafetyPolicy() {
  const emergency = useStore((s) => s.mode === "EMERGENCY_SIMULATED");
  const { policy: p, updatePolicy, simulateFall, tick } = useCare();
  return (
    <section className="care-manager">
      <h2>Shared safety policy</h2>
      <p>
        These settings use the existing six-state safety machine. Unanswered
        check-ins never label someone lost or contact police. All methods are
        simulated.
      </p>
      {(
        [
          ["firstSeconds", "First check-in response window"],
          ["repeatSeconds", "Repeated check-in delay"],
          ["nonurgentSeconds", "Nonurgent notification delay"],
          ["graceSeconds", "Geofence notification grace period"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label} (seconds)
          <input
            type="number"
            min={key === "graceSeconds" ? 0 : 5}
            max={3600}
            value={p[key]}
            onChange={(e) => updatePolicy({ [key]: Number(e.target.value) })}
          />
        </label>
      ))}
      {(
        [
          ["primary", "Notify primary caregiver"],
          [
            "secondary",
            "Notify secondary caregivers after unresolved check-in",
          ],
          ["push", "Simulated push notifications"],
          ["sms", "Simulated SMS"],
          ["call", "Simulated phone calls"],
          ["quiet", "Quiet hours for nonurgent notifications"],
          ["emergencySOS", "Approve notifications for explicit SOS"],
          [
            "emergencyFall",
            "Approve emergency escalation for explicit fall simulation",
          ],
        ] as const
      ).map(([key, label]) => (
        <label className="check-label" key={key}>
          <input
            type="checkbox"
            checked={p[key]}
            onChange={(e) => updatePolicy({ [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <label>
        Quiet hours start
        <input
          type="time"
          value={p.quietStart}
          onChange={(e) => updatePolicy({ quietStart: e.target.value })}
        />
      </label>
      <label>
        Quiet hours end
        <input
          type="time"
          value={p.quietEnd}
          onChange={(e) => updatePolicy({ quietEnd: e.target.value })}
        />
      </label>
      <p>
        SOS stays active regardless of notification permission. Only explicitly
        approved SOS/fall simulations may generate emergency-stage notification
        receipts.
      </p>
      <button
        className="button light"
        disabled={emergency}
        title={
          emergency
            ? "Resolve the current SOS before starting a fall scenario"
            : "Start a fictional fall scenario"
        }
        onClick={simulateFall}
      >
        Simulate fall
      </button>
      <button
        className="button light"
        onClick={() => tick(Date.now() + 3600000)}
      >
        Advance simulated notification clock
      </button>
      <SafeZoneSettings />
      <PolicyHistory />
    </section>
  );
}
export function PolicyHistory() {
  const receipts = useCare((s) => s.receipts);
  return (
    <section className="policy-history">
      <h3>Activity & notification history</h3>
      {!receipts.length && <p>No activities recorded yet.</p>}
      {receipts.slice(0, 30).map((r) => (
        <article className="contact-card" key={r.id}>
          <time>{new Date(r.time).toLocaleString()}</time>
          <h4>{r.reason}</h4>
          <p>
            {r.stage} · {r.why}
          </p>
          <p>
            {r.delivered
              ? r.outcome
              : `Pending until ${new Date(r.dueAt).toLocaleTimeString()}`}
          </p>
          <p>
            {r.recipients.length
              ? r.recipients
                  .map((c) => `${c.name} — simulated ${c.method}`)
                  .join("; ")
              : "No contacts notified."}
          </p>
          <p>Resolution: {r.resolves}</p>
        </article>
      ))}
    </section>
  );
}
export function PhoneSettings() {
  const s = useStore();
  return (
    <section className="care-manager">
      <h2>Caregiver settings</h2>
      <CompanionPersonalization />
      {(
        [
          ["wearer", "Wearer name"],
          ["caregiver", "Caregiver name"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            value={s.settings[key]}
            onChange={(e) => s.settingsUpdate({ [key]: e.target.value })}
          />
        </label>
      ))}
      {(
        [
          ["voice", "Spoken companion cues"],
          ["largeText", "Large text"],
          ["reducedMotion", "Reduced motion"],
        ] as const
      ).map(([key, label]) => (
        <label className="check-label" key={key}>
          <input
            type="checkbox"
            checked={s.settings[key]}
            onChange={(e) => s.settingsUpdate({ [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
    </section>
  );
}
export function Journeys() {
  const care = useCare(),
    entries = useMemory((s) => s.entries),
    [draft, setDraft] = useState<Journey>({
      id: crypto.randomUUID(),
      title: "",
      entries: [],
    }),
    [notice, setNotice] = useState("");
  return (
    <section className="care-manager">
      <h2>Memory Journeys</h2>
      <p>
        Connect a person, story, place and song using approved library items.
        Every step is optional; no recall is graded.
      </p>
      <label>
        Journey title
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      {[
        "Familiar person / story",
        "Related place",
        "Familiar song",
        "Optional final memory",
      ].map((label, i) => (
        <label key={label}>
          {label}
          <select
            aria-label={label}
            value={draft.entries[i] ?? ""}
            onChange={(e) => {
              const ids = [...draft.entries];
              ids[i] = e.target.value;
              setDraft({ ...draft, entries: ids });
            }}
          >
            <option value="">Skip this step</option>
            {entries
              .filter((e) => e.approved)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} · {e.kind}
                </option>
              ))}
          </select>
        </label>
      ))}
      <button
        className="button"
        onClick={() => {
          if (!draft.title.trim()) {
            setNotice("Enter a journey title.");
            return;
          }
          care.saveJourney({
            ...draft,
            title: draft.title.trim(),
            entries: draft.entries.filter(Boolean),
          });
          setDraft({ id: crypto.randomUUID(), title: "", entries: [] });
          setNotice("Journey saved. It is optional in Memory Garden.");
        }}
      >
        Save journey
      </button>
      <p role="status">{notice}</p>
      {care.journeys.map((j) => (
        <article className="contact-card" key={j.id}>
          <h3>{j.title}</h3>
          <button className="button light" onClick={() => setDraft({ ...j })}>
            Edit journey {j.title}
          </button>
          <button
            className="button light"
            onClick={() => care.deleteJourney(j.id)}
          >
            Delete journey {j.title}
          </button>
        </article>
      ))}
    </section>
  );
}
export function CareRuntime() {
  const tick = useCare((s) => s.tick);
  useEffect(() => {
    const timer = setInterval(() => tick(), 1000);
    return () => clearInterval(timer);
  }, [tick]);
  return null;
}
