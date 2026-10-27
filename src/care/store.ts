import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useStore } from "../store";

export type Method = "push" | "sms" | "call";
export interface Contact {
  id: string;
  name: string;
  relationship: string;
  countryCode: string;
  phone: string;
  photoId?: string;
  preferred: Method;
  push: boolean;
  sms: boolean;
  call: boolean;
  primary: boolean;
  emergency: boolean;
  enabled: boolean;
}
export interface Policy {
  firstSeconds: number;
  repeatSeconds: number;
  nonurgentSeconds: number;
  primary: boolean;
  secondary: boolean;
  push: boolean;
  sms: boolean;
  call: boolean;
  graceSeconds: number;
  quiet: boolean;
  quietStart: string;
  quietEnd: string;
  emergencySOS: boolean;
  emergencyFall: boolean;
}
export interface Receipt {
  id: string;
  eventId: string;
  time: number;
  dueAt: number;
  reason: string;
  stage: string;
  why: string;
  outcome: string;
  resolves: string;
  recipients: { id: string; name: string; method: Method }[];
  delivered: boolean;
}
export interface Journey {
  id: string;
  title: string;
  entries: string[];
}
export const defaultPolicy: Policy = {
  firstSeconds: 30,
  repeatSeconds: 30,
  nonurgentSeconds: 60,
  primary: true,
  secondary: true,
  push: true,
  sms: false,
  call: false,
  graceSeconds: 30,
  quiet: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  emergencySOS: true,
  emergencyFall: false,
};
export function normalizePhone(country: string, local: string) {
  const code = country.trim();
  if (!/^\+[1-9]\d{0,2}$/.test(code))
    throw Error("Enter a country code starting with +, such as +1.");
  if (!/^[+\d ()-]+$/.test(local))
    throw Error(
      "Use digits, spaces, parentheses or hyphens for the phone number.",
    );
  const compact = local.replace(/[ ()-]/g, "");
  const result = compact.startsWith("+")
    ? compact
    : code + compact.replace(/^0/, "");
  if (!/^\+[1-9]\d{7,14}$/.test(result))
    throw Error(
      "Enter a valid phone number with 8–15 digits including the country code.",
    );
  if (compact.startsWith("+") && !compact.startsWith(code))
    throw Error("The phone number and country code do not match.");
  return result;
}
const required = (list: Contact[]) =>
  list.some((c) => c.enabled && c.primary && (c.push || c.sms || c.call));
export function quietNow(p: Policy, time: number) {
  if (!p.quiet) return false;
  const d = new Date(time),
    value = d.getHours() * 60 + d.getMinutes();
  const minutes = (v: string) =>
    Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  const start = minutes(p.quietStart),
    end = minutes(p.quietEnd);
  return (
    start === end ||
    (start < end
      ? value >= start && value < end
      : value >= start || value < end)
  );
}
interface CareState {
  contacts: Contact[];
  policy: Policy;
  receipts: Receipt[];
  journeys: Journey[];
  saveContact: (c: Contact) => string | null;
  deleteContact: (id: string) => string | null;
  reorderContact: (id: string, delta: number) => void;
  updatePolicy: (patch: Partial<Policy>) => void;
  saveJourney: (j: Journey) => void;
  deleteJourney: (id: string) => void;
  tick: (now?: number) => void;
  simulateFall: () => void;
}
export const useCare = create<CareState>()(
  persist(
    (set, get) => ({
      contacts: [
        {
          id: "sample-primary",
          name: "Jamie Chen",
          relationship: "Family caregiver",
          countryCode: "+1",
          phone: "+12025550101",
          preferred: "push",
          push: true,
          sms: false,
          call: false,
          primary: true,
          emergency: true,
          enabled: true,
        },
        {
          id: "sample-secondary",
          name: "Morgan Chen",
          relationship: "Family",
          countryCode: "+1",
          phone: "+12025550102",
          preferred: "push",
          push: true,
          sms: false,
          call: false,
          primary: false,
          emergency: true,
          enabled: true,
        },
      ],
      policy: { ...defaultPolicy },
      receipts: [],
      journeys: [],
      saveContact: (c) => {
        let phone: string;
        try {
          phone = normalizePhone(c.countryCode, c.phone);
        } catch (e) {
          return (e as Error).message;
        }
        if (!c.name.trim() || c.name.length > 80)
          return "Enter a name of 1–80 characters.";
        const entry = { ...c, name: c.name.trim(), phone };
        if (!entry[entry.preferred])
          return "Enable permission for the preferred contact method, or choose another method.";
        const list = get().contacts.some((x) => x.id === c.id)
          ? get().contacts.map((x) => (x.id === c.id ? entry : x))
          : [...get().contacts, entry];
        if (!required(list))
          return "Keep at least one enabled primary caregiver with a permitted contact method.";
        set({ contacts: list });
        if (entry.primary && entry.enabled)
          useStore.getState().settingsUpdate({ caregiver: entry.name });
        return null;
      },
      deleteContact: (id) => {
        const list = get().contacts.filter((c) => c.id !== id);
        if (!required(list))
          return "The final required caregiver cannot be deleted. Add another enabled primary caregiver first.";
        set({ contacts: list });
        return null;
      },
      reorderContact: (id, delta) => {
        const list = [...get().contacts],
          i = list.findIndex((c) => c.id === id),
          j = i + delta;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        set({ contacts: list });
      },
      updatePolicy: (patch) => {
        const policy = { ...get().policy, ...patch };
        for (const key of [
          "firstSeconds",
          "repeatSeconds",
          "nonurgentSeconds",
          "graceSeconds",
        ] as const)
          policy[key] = Math.max(
            key === "graceSeconds" ? 0 : 5,
            Math.min(
              3600,
              Number.isFinite(policy[key]) ? policy[key] : defaultPolicy[key],
            ),
          );
        for (const key of ["quietStart", "quietEnd"] as const)
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(policy[key]))
            policy[key] = defaultPolicy[key];
        set({ policy });
        useStore.getState().settingsUpdate({
          checkInTimeoutSeconds: policy.firstSeconds,
          repeatCheckInSeconds: policy.repeatSeconds,
          nonurgentCheckInSeconds: policy.nonurgentSeconds,
        });
      },
      saveJourney: (j) =>
        set((s) => ({
          journeys: s.journeys.some((x) => x.id === j.id)
            ? s.journeys.map((x) => (x.id === j.id ? j : x))
            : [...s.journeys, j],
        })),
      deleteJourney: (id) =>
        set((s) => ({ journeys: s.journeys.filter((j) => j.id !== id) })),
      tick: (now = Date.now()) => {
        if (!get().receipts.some((r) => !r.delivered)) return;
        const safety = useStore.getState();
        set((s) => ({
          receipts: s.receipts.map((r) => {
            if (r.delivered) return r;
            const cleared =
              (/deviation/i.test(r.reason) &&
                (safety.signals.deviationMeters < 100 ||
                  safety.signals.gpsConfidence < 0.6)) ||
              (/requested caregiver assistance|caregiver notification/i.test(
                r.reason,
              ) &&
                safety.familyRequest?.status === "responded");
            if (cleared)
              return {
                ...r,
                recipients: [],
                delivered: true,
                outcome:
                  "Queued notification cancelled after the concern was reviewed or readings changed.",
              };
            if (now < r.dueAt) return r;
            if (
              quietNow(s.policy, now) &&
              r.stage !== "Explicit emergency review"
            )
              return {
                ...r,
                recipients: [],
                delivered: true,
                outcome:
                  "Quiet hours suppressed this nonurgent simulated notification.",
              };
            const recipients = r.recipients.filter((target) => {
              const c = s.contacts.find((c) => c.id === target.id);
              return (
                c?.enabled &&
                c[target.method] &&
                s.policy[target.method] &&
                (c.primary ? s.policy.primary : s.policy.secondary)
              );
            });
            return {
              ...r,
              recipients,
              delivered: true,
              outcome: recipients.length
                ? "Simulated notification recorded; no real communication."
                : "Logged without notification; no currently permitted recipient.",
            };
          }),
        }));
      },
      simulateFall: () => {
        const s = useStore.getState();
        s.event(
          get().policy.emergencyFall ? "SOS" : "CHECK",
          get().policy.emergencyFall
            ? "Explicitly approved fall simulation — emergency review requested"
            : "Fall simulation — check-in requested, emergency escalation not approved",
        );
      },
    }),
    {
      name: "wayhome-care-v1",
      version: 1,
      merge: (saved, current) => {
        const s = saved as Partial<CareState> | undefined;
        return { ...current, ...s, policy: { ...defaultPolicy, ...s?.policy } };
      },
    },
  ),
);

// One observer of the existing safety machine; it only records simulated notifications.
useStore.subscribe((s, prev) => {
  if (
    s.settings.checkInTimeoutSeconds !== prev.settings.checkInTimeoutSeconds ||
    s.settings.repeatCheckInSeconds !== prev.settings.repeatCheckInSeconds ||
    s.settings.nonurgentCheckInSeconds !== prev.settings.nonurgentCheckInSeconds
  ) {
    useCare.setState((c) => ({
      policy: {
        ...c.policy,
        firstSeconds: s.settings.checkInTimeoutSeconds,
        repeatSeconds: s.settings.repeatCheckInSeconds,
        nonurgentSeconds: s.settings.nonurgentCheckInSeconds,
      },
    }));
  }
  const events = s.alerts.filter(
    (a) => !prev.alerts.some((old) => old.id === a.id),
  );
  if (!events.length) return;
  const care = useCare.getState(),
    p = care.policy;
  const receipts = events.map((a) => {
    const urgent = !!a.emergency,
      help =
        /assistance|notification|Unresolved|Missed|Fall|primary caregiver|deviation/i.test(
          a.title,
        );
    const notifying =
      urgent ||
      (help &&
        !/^Unresolved check-in/.test(a.title) &&
        (!/Repeated|check-in/i.test(a.title) || s.settings.checkInNotify));
    const approved = urgent
      ? a.title.includes("fall")
        ? p.emergencyFall
        : p.emergencySOS
      : true;
    const quiet = !urgent && quietNow(p, a.time);
    const secondaryStage = /Unresolved|Missed/i.test(a.title);
    const candidates = care.contacts.filter(
      (c) =>
        c.enabled &&
        (urgent
          ? c.emergency
          : c.primary
            ? p.primary
            : secondaryStage && p.secondary),
    );
    const recipients =
      notifying && approved && !quiet
        ? candidates.flatMap((c) => {
            const permitted = [
              c.preferred,
              ...(["push", "sms", "call"] as Method[]).filter(
                (m) => m !== c.preferred,
              ),
            ].find((m) => p[m] && c[m]);
            return permitted
              ? [{ id: c.id, name: c.name, method: permitted }]
              : [];
          })
        : [];
    const grace = urgent
      ? 0
      : /deviation/i.test(a.title)
        ? p.graceSeconds * 1000
        : help && !/Repeated|Unresolved/i.test(a.title)
          ? p.nonurgentSeconds * 1000
          : 0;
    return {
      id: crypto.randomUUID(),
      eventId: a.id,
      time: a.time,
      dueAt: a.time + grace,
      reason: a.title,
      stage: urgent
        ? "Explicit emergency review"
        : help
          ? "Caregiver support"
          : "Activity recorded",
      why: !approved
        ? "Emergency notification is not approved by policy."
        : quiet
          ? "Quiet hours suppress nonurgent notifications; the activity remains recorded."
          : !notifying
            ? "No notification is needed for this activity."
            : recipients.length
              ? "Enabled contacts and permitted simulated methods selected in escalation order."
              : "No enabled contact has a permitted policy method.",
      outcome: recipients.length
        ? grace === 0
          ? "Simulated notification recorded; no real communication."
          : "Pending simulated notification"
        : `Logged without notification. Safety state: ${s.mode}.`,
      resolves: urgent
        ? "Explicit caregiver incident resolution and verification; acknowledgment alone is insufficient."
        : "Wearer response or explicit caregiver review, with existing safety conditions checked separately.",
      recipients,
      delivered: grace === 0 || recipients.length === 0,
    } satisfies Receipt;
  });
  useCare.setState({ receipts: [...receipts, ...care.receipts].slice(0, 300) });
});
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === "wayhome-care-v1") void useCare.persist.rehydrate();
  });
