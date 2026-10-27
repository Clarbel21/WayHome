import {
  CheckInHistory,
  CheckInRuntime,
  CheckInDemo,
  FamilyResponse,
} from "./components/CheckInSupport";
import { RouteFocus } from "./components/RouteFocus";
import { lazy, Suspense, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  Battery,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  Home,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  Monitor,
  Plus,
  Radio,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Watch,
  Wifi,
  X,
} from "lucide-react";
import Landing from "./landing/Landing";
import { useStore, status, samples, type Event, type Landmark } from "./store";
import { Wearable, Photo } from "./components/Wearable";
import { LandmarkPhoto } from "./components/LandmarkPhoto";
import { WearableConfiguration } from "./components/WearableConfiguration";
import { SafetyScenarios } from "./components/SafetyScenarios";
import { wearLabels } from "./services/safety";
import { MemoryGardenHome } from "./memory/MemoryPlayer";
import {
  CaregiverMemoryLibrary,
  MemoryActivityHistory,
} from "./memory/MemoryLibrary";
import { MemoryGardenDemo } from "./memory/MemoryDemo";
import { useMemory, safetyReady } from "./memory/store";
import { EmergencyAssistance } from "./components/EmergencyAssistance";
import { CompanionPersonalization } from "./components/CompanionPersonalization";
import { Sprout } from "./components/Sprout";
const LazyRouteMap = lazy(() =>
  import("./components/RouteMap").then((m) => ({ default: m.RouteMap })),
);
function RouteMap() {
  return (
    <Suspense
      fallback={
        <div className="empty" role="status">
          Preparing the neighborhood…
        </div>
      }
    >
      <LazyRouteMap />
    </Suspense>
  );
}
const actions: { label: string; event: Event; description: string }[] = [
  {
    label: "Start Normal Walk",
    event: "WALK",
    description: "A calm start in the neighborhood",
  },
  {
    label: "Trigger Gentle Check-in",
    event: "CHECK",
    description: "Your companion checks how the wearer feels",
  },
  {
    label: "Simulate Disorientation",
    event: "LOST",
    description: "Offer reassurance and a familiar place",
  },
  {
    label: "Start Guided Return",
    event: "GUIDE",
    description: "One simple instruction at a time",
  },
  {
    label: "Simulate Successful Reorientation",
    event: "OKAY",
    description: "Confirm the wearer feels okay",
  },
  {
    label: "Request Caregiver Help",
    event: "HELP",
    description: "Send a simulated caregiver notification",
  },
  {
    label: "Trigger Simulated SOS",
    event: "SOS",
    description: "Demonstrate an urgent help request",
  },
  {
    label: "Simulate Wearable Removal",
    event: "REMOVE",
    description: "Update wear detection and alert",
  },
  {
    label: "Simulate Device Disconnection",
    event: "DISCONNECT",
    description: "Show an offline device warning",
  },
];
function Brand() {
  return (
    <Link to="/" className="brand">
      <span>
        <Leaf size={23} />
      </span>
      WayHome<span className="brand-dot">.</span>
    </Link>
  );
}
function Badge() {
  const mode = useStore((s) => s.mode);
  return (
    <span
      className={`badge ${mode === "EMERGENCY_SIMULATED" ? "danger" : mode === "NORMAL" ? "safe" : "attention"}`}
    >
      <span className="live-dot" />
      {status[mode]}
    </span>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const s = useStore();
  const location = useLocation();
  const links = [
    ["/caregiver", "Overview", LayoutDashboard],
    ["/caregiver/location", "Live location", MapPin],
    ["/caregiver/alerts", "Alerts", Bell],
    ["/caregiver/emergency", "Emergency Assistance", ShieldCheck],
    ["/caregiver/twin", "Digital twin", Watch],
    ["/caregiver/landmarks", "Familiar landmarks", Compass],
    ["/caregiver/library", "Memory Library", Leaf],
    ["/caregiver/settings", "Settings", Settings],
    ["/demo", "Demo control center", Sparkles],
  ] as const;
  return (
    <div
      className={`app ${s.settings.largeText ? "large-text" : ""} ${s.settings.reducedMotion ? "reduce-motion" : ""}`}
    >
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Brand />
        <div className="workspace-label">CAREGIVER WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([url, label, Icon]) => (
            <NavLink
              key={url}
              to={url}
              end={url === "/caregiver"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
              {label === "Alerts" && s.alerts.some((a) => !a.read) && (
                <span className="nav-count">
                  {s.alerts.filter((a) => !a.read).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sprout-note">
            <Sprout small />
            <strong>
              A little reassurance.
              <br />A little more independence.
            </strong>
            <p>Here for every step of the way.</p>
          </div>
          <Link className="mode-link" to="/companion">
            <Watch size={17} />
            Switch to Companion Mode <ArrowRight size={16} />
          </Link>
          <div className="profile">
            <span className="avatar">{s.settings.caregiver[0] || "J"}</span>
            <div>
              <strong>{s.settings.caregiver}</strong>
              <small>Family caregiver</small>
            </div>
            <ShieldCheck size={18} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Your circle of care <ChevronRight size={14} />{" "}
            <strong>
              {links.find((l) => l[0] === location.pathname)?.[1] || "Overview"}
            </strong>
          </span>
          <div className="topbar-right">
            <span className="simulation-pill">
              <span />
              SIMULATION MODE
            </span>
            <Link
              to="/caregiver/alerts"
              className="notification-icon"
              aria-label="Open alerts"
            >
              <Bell size={20} />
              {s.settings.notifications && s.alerts.some((a) => !a.read) && (
                <i />
              )}
            </Link>
            <span className="avatar tiny">
              {s.settings.caregiver[0] || "J"}
            </span>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          Made for moments that matter.{" "}
          <span>WayHome · Moonshot 101 · Educational prototype</span>
        </footer>
      </div>
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Overview() {
  const s = useStore();
  return (
    <>
      <Heading
        eyebrow="A LITTLE PEACE OF MIND"
        title={`Looking out for ${s.settings.wearer.split(" ")[0]}.`}
        description="A familiar companion. A reassuring connection. You're in this together."
        action={
          <Link className="button light" to="/guided">
            <Sparkles size={17} />
            Start Guided Demo
          </Link>
        }
      />
      <div className="welcome-banner">
        <div className="banner-icon">
          <ShieldCheck size={29} />
        </div>
        <div>
          <h2>
            {s.mode === "NORMAL" && s.connected && s.worn
              ? `${s.settings.wearer.split(" ")[0]} is enjoying a little independence.`
              : "A little support is on the way."}
          </h2>
          <p>
            {!s.connected
              ? "The simulated device is offline. Location and wear status are uncertain."
              : !s.worn
                ? `Wear inference: ${wearLabels[s.wearStatus]}. Please check the wearer and attachment.`
                : s.mode === "NORMAL"
                  ? ` ${s.settings.companionName} is by their side. We'll keep you in the loop.`
                  : `${s.settings.companionName} and your dashboard are responding together.`}
          </p>
        </div>
        <Badge />
      </div>
      <div className="stats-grid">
        <Stat
          icon={<Heart />}
          label="Safety status"
          value={status[s.mode]}
          detail="Updated with every simulation event"
        />
        <Stat
          icon={<Activity />}
          label="Last check-in"
          value={new Date(s.lastCheck).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          detail="Wearer confirmation"
        />
        <Stat
          icon={<Battery />}
          label="Device battery"
          value={`${s.battery}%`}
          detail="Simulated battery level"
        />
        <Stat
          icon={<Wifi />}
          label="Connection"
          value={s.connected ? "Connected" : "Offline"}
          detail={`${wearLabels[s.wearStatus]} · inferred, not guaranteed`}
        />
      </div>
      <div className="overview-grid">
        <section className="card location-card">
          <div className="card-heading">
            <div>
              <h2>Around the neighborhood</h2>
              <p>A familiar route, one step at a time.</p>
            </div>
            <span className="subtle-tag">
              <span className="live-dot" />
              SIMULATED LIVE
            </span>
          </div>
          <RouteMap />
        </section>
        <section className="card companion-card">
          <div className="card-heading">
            <div>
              <h2>A moment with {s.settings.companionName}</h2>
              <p>
                Your window into {s.settings.wearer.split(" ")[0]}'s companion.
              </p>
            </div>
            <span className="green-icon">
              <Leaf size={21} />
            </span>
          </div>
          <div className="mini-companion">
            <Sprout />
            <span className="state-caption">
              {s.mode.replaceAll("_", " ").toLowerCase()}
            </span>
            <h3>
              {s.mode === "NORMAL"
                ? "A good day for a little walk."
                : status[s.mode]}
            </h3>
            <p>
              See what {s.settings.wearer.split(" ")[0]} sees, in real time.
            </p>
          </div>
          <Link className="card-link" to="/caregiver/twin">
            View digital twin <ArrowRight size={17} />
          </Link>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Latest moments</h2>
              <p>The small updates that keep you connected.</p>
            </div>
            <Link className="text-button" to="/caregiver/alerts">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <Alerts compact />
        </section>
        <section className="card gentle-card">
          <span className="eyebrow">DESIGNED FOR REASSURANCE</span>
          <h2>
            Familiar places.
            <br />
            Confident steps.
          </h2>
          <p>
            Little landmarks can make a big difference. Add the places that feel
            like home.
          </p>
          <Link className="button light" to="/caregiver/landmarks">
            Manage landmarks <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="card settings-card overview-memory">
        <div className="card-heading">
          <h2>Moments in the Memory Garden</h2>
          <Link className="text-button" to="/caregiver/library">
            Memory Library →
          </Link>
        </div>
        <MemoryActivityHistory compact />
      </section>
      <div className="emergency-overview-link">
        <Link className="text-button" to="/caregiver/emergency">
          <ShieldCheck size={17} />
          Emergency Assistance · review or simulate an escalation{" "}
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="demo-strip">
        <span className="demo-icon">
          <Monitor size={23} />
        </span>
        <div>
          <strong>See the whole journey, together.</strong>
          <p>
            Explore how WayHome responds with our interactive scenario
            simulator.
          </p>
        </div>
        <Link className="text-button" to="/demo">
          Open demo controls <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="stat">
      <div className="stat-label">
        {label}
        <span>{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}
function Alerts({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const list = compact ? s.alerts.slice(0, 3) : s.alerts;
  return (
    <div className="alerts">
      {!compact && (
        <>
          <FamilyResponse />
          <CheckInHistory />
        </>
      )}
      {!list.length ? (
        <div className="empty">
          <ShieldCheck size={28} />
          <strong>No alert history yet.</strong>
          <p>
            Check-ins and help requests will appear here as you explore the
            demo.
          </p>
        </div>
      ) : (
        list.map((a) => (
          <div className={`alert-row ${!a.read ? "unread" : ""}`} key={a.id}>
            <span className={`alert-icon ${a.urgent ? "urgent" : ""}`}>
              {a.urgent ? <Bell size={18} /> : <Check size={18} />}
            </span>
            <div>
              <strong>{a.title}</strong>
              <small>{new Date(a.time).toLocaleString()}</small>
              {a.emergency && (
                <div className="alert-emergency">
                  <p>SIMULATION — No police were contacted</p>
                  <p>
                    {a.emergency.wearer} · {a.emergency.location}
                  </p>
                  <p>
                    {a.emergency.safetyStatus} · {a.emergency.reason}
                  </p>
                  {a.emergency.acknowledgedAt ? (
                    <p>
                      Acknowledged by {a.emergency.acknowledgedBy} ·{" "}
                      {new Date(a.emergency.acknowledgedAt).toLocaleString()}
                    </p>
                  ) : (
                    <button
                      className="text-button"
                      onClick={() => s.acknowledgeEmergency(a.id)}
                    >
                      Acknowledge event
                    </button>
                  )}
                </div>
              )}
            </div>
            {!a.read ? (
              <button className="text-button" onClick={() => s.read(a.id)}>
                Mark read
              </button>
            ) : (
              <small>Read</small>
            )}
          </div>
        ))
      )}
    </div>
  );
}
function Landmarks() {
  const s = useStore();
  const [editing, setEditing] = useState<Landmark | null>(null);
  const [error, setError] = useState("");
  function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim() || !editing.instruction.trim()) {
      setError("Please add a name and a simple instruction.");
      return;
    }
    if (!editing.photoId && !/^(https?:\/\/|\/images\/)/.test(editing.photo)) {
      setError("Choose a built-in image or enter an http(s) photo URL.");
      return;
    }
    s.saveLandmark({
      ...editing,
      name: editing.name.trim(),
      instruction: editing.instruction.trim(),
    });
    setEditing(null);
    setError("");
  }
  return (
    <>
      <Heading
        eyebrow="PLACES THAT FEEL LIKE HOME"
        title="Familiar landmarks"
        description="A recognizable place can turn uncertainty into a confident next step."
        action={
          <button
            className="button"
            onClick={() => {
              setEditing({
                id: crypto.randomUUID(),
                name: "",
                instruction: "",
                photo: samples[0],
                approved: true,
              });
              setError("");
            }}
          >
            <Plus size={18} />
            Add landmark
          </button>
        }
      />
      <div className="landmark-grid">
        {s.landmarks.map((l) => (
          <section className="card landmark-card" key={l.id}>
            <LandmarkPhoto landmark={l} />
            <div className="landmark-content">
              <span className={`badge ${l.approved ? "safe" : "attention"}`}>
                {l.approved ? "Approved for guidance" : "Not approved"}
              </span>
              <h2>{l.name}</h2>
              <p>{l.instruction}</p>
              {l.sourceMemoryId && (
                <p className="help-text">
                  Independent memory-place proposal. Reminiscence approval does
                  not permit navigation. Review this instruction and photo
                  before approving.
                </p>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={l.approved}
                  onChange={(e) =>
                    s.saveLandmark({ ...l, approved: e.target.checked })
                  }
                />
                {l.sourceMemoryId
                  ? "Separately approve for navigation"
                  : "Show during guided return"}
              </label>
              <div className="button-row">
                <button
                  className="button light"
                  onClick={() => {
                    setEditing({ ...l });
                    setError("");
                  }}
                >
                  Edit landmark
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${l.name}`}
                  onClick={() => s.deleteLandmark(l.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
      {!s.landmarks.length && (
        <div className="card empty">
          <Compass />
          <h2>No familiar places yet</h2>
          <p>Add a landmark to make guided return available.</p>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="landmark-title"
            className="modal card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(null);
              if (e.key === "Tab") {
                const items = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button,input,textarea,select",
                  ),
                );
                const first = items[0],
                  last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="card-heading">
              <h2 id="landmark-title">
                {s.landmarks.some((l) => l.id === editing.id) ? "Edit" : "Add"}{" "}
                a familiar place
              </h2>
              <button
                type="button"
                autoFocus
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <label>
              Name
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Simple navigation instruction
              <textarea
                required
                value={editing.instruction}
                onChange={(e) =>
                  setEditing({ ...editing, instruction: e.target.value })
                }
              />
            </label>
            <label>
              Built-in sample
              <select
                value={samples.includes(editing.photo) ? editing.photo : ""}
                onChange={(e) => {
                  if (e.target.value)
                    setEditing({
                      ...editing,
                      photo: e.target.value,
                      photoId: undefined,
                    });
                }}
              >
                <option value="">Custom photo URL</option>
                {samples.map((p, i) => (
                  <option key={p} value={p}>
                    {["Home", "Bakery", "Garden", "Library"][i]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Photo URL
              <input
                value={editing.photo}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    photo: e.target.value,
                    photoId: undefined,
                  })
                }
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.approved}
                onChange={(e) =>
                  setEditing({ ...editing, approved: e.target.checked })
                }
              />
              Approved for guided return
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button" type="submit">
              Save landmark <Check size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
function SettingsPage() {
  const s = useStore();
  return (
    <>
      <Heading
        eyebrow="MAKE WAYHOME YOURS"
        title="A circle of care"
        description="Sample profiles and preferences are saved automatically on this browser."
      />
      <CheckInDemo />
      <CompanionPersonalization />
      <WearableConfiguration />
      <div className="settings-grid">
        <section className="card settings-card">
          <h2>People & connections</h2>
          {(
            [
              ["wearer", "Wearer's display name"],
              ["caregiver", "Caregiver's name"],
              ["emergency", "Emergency contact name"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                maxLength={60}
                value={s.settings[key]}
                onChange={(e) => s.settingsUpdate({ [key]: e.target.value })}
                onBlur={() => {
                  if (!s.settings[key].trim())
                    s.settingsUpdate({
                      [key]:
                        key === "wearer"
                          ? "Alex Chen"
                          : key === "caregiver"
                            ? "Jamie Chen"
                            : "Morgan Chen",
                    });
                }}
              />
            </label>
          ))}
          <p className="help-text">
            Sample contacts only. No phone calls or external messages are sent.
          </p>
        </section>
        <section className="card settings-card">
          <h2>Comfort & accessibility</h2>
          {(
            [
              [
                "voice",
                "Companion voice",
                `Read ${s.settings.companionName}’s messages aloud using your browser.`,
              ],
              [
                "notifications",
                "Notification indicators",
                "Show the unread indicator in the dashboard header.",
              ],
              [
                "largeText",
                "Larger text",
                "Make dashboard text easier to read.",
              ],
              [
                "reducedMotion",
                "Reduce motion",
                `Keep ${s.settings.companionName} and screen transitions still.`,
              ],
            ] as const
          ).map(([key, label, description]) => (
            <label className="setting-toggle" key={key}>
              <div>
                <strong>{label}</strong>
                <p>{description}</p>
              </div>
              <input
                type="checkbox"
                checked={s.settings[key]}
                onChange={(e) => s.settingsUpdate({ [key]: e.target.checked })}
              />
            </label>
          ))}
        </section>
      </div>
      <section className="card settings-card">
        <h2>Presentation sandbox</h2>
        <p>
          All location, risk detection, battery readings, and help requests are
          simulated.
        </p>
        <div className="button-row">
          <Link className="button" to="/demo">
            Open demo controls <ArrowRight size={16} />
          </Link>
          <button
            className="button light"
            disabled={s.mode === "EMERGENCY_SIMULATED"}
            onClick={s.reset}
          >
            <RotateCcw size={16} />
            Reset simulation
          </button>
        </div>
        <p className="help-text">
          Full demo reset creates a healthy fictional starting fixture and
          clears alerts. It is unavailable during S5: use incident resolution
          and verification first. Your profile, attachment and landmarks stay
          saved.
        </p>
      </section>
    </>
  );
}
function DemoControls() {
  const s = useStore();
  return (
    <>
      <Heading
        eyebrow="THE WAYHOME SANDBOX"
        title="Every moment, connected."
        description={`Run a scenario and see ${s.settings.companionName}, safety status, location, and alerts respond together.`}
        action={
          <Link className="button light" to="/guided">
            <Sparkles size={17} />
            Start Guided Demo
          </Link>
        }
      />
      <CheckInDemo />
      <div className="demo-layout">
        <div>
          <div className="scenario-grid">
            {actions.map((a, i) => (
              <button
                className={`scenario ${a.event === "SOS" ? "sos-scenario" : ""}`}
                key={a.event}
                onClick={() => s.event(a.event)}
              >
                <span className="scenario-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{a.label}</strong>
                  <p>{a.description}</p>
                </div>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
          <Link className="button light memory-demo-link" to="/memory-demo">
            <Leaf size={17} />
            Memory Garden Demo
          </Link>
          <button
            className="button light reset-button"
            disabled={s.mode === "EMERGENCY_SIMULATED"}
            onClick={s.reset}
          >
            <RotateCcw size={16} />
            Reset Demo
          </button>
          <SafetyScenarios />
          <WearableConfiguration />
          {s.mode === "EMERGENCY_SIMULATED" && (
            <p className="memory-notice">
              S5 stays active. Resolve and verify the incident in Emergency
              Assistance before resetting the demo.
            </p>
          )}
          <section className="card scenario-summary">
            <Badge />
            <p>
              Device: {s.connected ? "connected" : "offline"} ·{" "}
              {`${wearLabels[s.wearStatus]} (inferred)`} · Position {s.position}
              /6
            </p>
            <Link to="/caregiver/alerts" className="text-button">
              {s.alerts.filter((a) => !a.read).length} unread alerts{" "}
              <ArrowRight size={15} />
            </Link>
          </section>
        </div>
        <section className="card demo-twin">
          <div className="eyebrow">LIVE DIGITAL TWIN</div>
          <Wearable compact />
        </section>
      </div>
    </>
  );
}
function Companion() {
  const s = useStore();
  return (
    <div
      className={`companion-page ${s.settings.largeText ? "large-text" : ""} ${s.settings.reducedMotion ? "reduce-motion" : ""}`}
    >
      <header className="public-header">
        <Brand />
        <Link className="button light" to="/caregiver">
          <LayoutDashboard size={17} />
          Caregiver Mode
        </Link>
      </header>
      <main className="companion-main">
        <div className="eyebrow">A FAMILIAR FRIEND, ALWAYS NEAR</div>
        <h1>
          Here with you.
          <br />
          <em>Every step.</em>
        </h1>
        <p>A little reassurance, wherever the day takes you.</p>
        <Wearable />
        <Link
          className="button explore-memories"
          to="/memories"
          aria-describedby={
            !safetyReady() ? "memories-availability" : undefined
          }
        >
          <Leaf size={23} />
          Explore Memories
        </Link>
        {!safetyReady() && (
          <p
            id="memories-availability"
            className="companion-memory-notice"
            role="status"
          >
            Memory Garden is paused. Select Explore Memories to see why and open
            caregiver review.
          </p>
        )}
        <div className="companion-foot">
          <ShieldCheck size={17} /> Educational simulation · no real emergency
          calls
        </div>
        <Link to="/demo" className="text-button">
          Explore demo controls <ArrowRight size={16} />
        </Link>
      </main>
    </div>
  );
}
const steps = [
  {
    title: "A little independence",
    body: "Alex is enjoying a neighborhood walk. {companion} is happy, the device is connected, and the caregiver has a reassuring overview.",
    event: "WALK",
  },
  {
    title: "A gentle check-in",
    body: "A simulated unusual route event prompts {companion} to ask “Are you feeling okay?” without overwhelming Alex.",
    event: "CHECK",
  },
  {
    title: "A moment of uncertainty",
    body: "Alex selects “I need help.” {companion} offers a calm, reassuring response and updates the caregiver.",
    event: "LOST",
  },
  {
    title: "Let’s find something familiar",
    body: "{companion} says “That’s okay. Let’s find a place you recognize.” Familiar places support reorientation.",
    event: "LOST",
  },
  {
    title: "A place Alex knows",
    body: "An approved landmark and one simple instruction appear. No complicated directions or crowded screens.",
    event: "GUIDE",
  },
  {
    title: "One confident step",
    body: "Alex recognizes the place. Select “I see it · Next step” on the wearable to move through the familiar landmarks.",
    event: "GUIDE",
  },
  {
    title: "Connected through the journey",
    body: "Alex confirms feeling okay. The caregiver sees the updated safety status and a timestamped check-in.",
    event: "OKAY",
  },
  {
    title: "An alternate path to support",
    body: "For this alternate scenario, a simulated SOS updates the wearable and adds an urgent caregiver alert. No real emergency services are contacted.",
    event: "SOS",
  },
] as const;
function Guided() {
  const s = useStore();
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  function go(i: number) {
    setIndex(i);
    setStarted(true);
    s.event(steps[i].event);
  }
  return (
    <>
      <Heading
        eyebrow="A 2–3 MINUTE WALK THROUGH WAYHOME"
        title="A journey home, together."
        description="A presenter-led story of reassurance, recognition, and connection."
      />
      <div className="guided-layout">
        <section className="card guided-story">
          <span className="subtle-tag">
            STEP {index + 1} OF {steps.length}
          </span>
          <div className="step-dots">
            {steps.map((step, i) => (
              <button
                key={step.title}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === index ? "step" : undefined}
                className={i <= index ? "complete" : ""}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <h2>{steps[index].title}</h2>
          <p>
            {steps[index].body
              .replaceAll("{companion}", s.settings.companionName)
              .replaceAll("Alex", s.settings.wearer)}
          </p>
          <div className="presenter-note">
            <CircleHelp size={20} />
            <p>
              Presenter tip: spend about 15–20 seconds on each step. The digital
              twin is interactive, and all changes appear in the caregiver
              dashboard.
            </p>
          </div>
          <Badge />
          <div className="button-row">
            <button
              className="button light"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={17} />
              Back
            </button>
            <button
              className="button"
              onClick={() => go(!started ? 0 : Math.min(7, index + 1))}
              disabled={started && index === 7}
            >
              {!started
                ? "Begin story"
                : index === 7
                  ? "Story complete"
                  : "Next"}
              <ChevronRight size={17} />
            </button>
          </div>
          <button
            className="text-button"
            onClick={() => {
              s.reset();
              setStarted(false);
              setIndex(0);
            }}
          >
            <RotateCcw size={15} />
            Reset presentation
          </button>
          {s.mode === "EMERGENCY_SIMULATED" && (
            <Link className="text-button" to="/caregiver/emergency">
              Resolve and verify S5 before restarting the walk →
            </Link>
          )}
          <Link className="text-button" to="/caregiver">
            See caregiver dashboard <ArrowRight size={15} />
          </Link>
        </section>
        <section className="card demo-twin">
          <div className="eyebrow">WHAT ALEX SEES</div>
          <Wearable compact />
        </section>
      </div>
    </>
  );
}
function CaregiverRoutes() {
  const memorySession = useMemory((s) => s.session);
  return (
    <Shell>
      <Routes>
        <Route index element={<Overview />} />
        <Route
          path="location"
          element={
            <>
              <Heading
                eyebrow="FAMILIAR STREETS, GENTLE GUIDANCE"
                title="A little closer to home"
                description="Explore the fictional walking route. Movement and location are simulated."
              />
              <section className="card">
                <RouteMap />
              </section>
            </>
          }
        />
        <Route
          path="alerts"
          element={
            <>
              <Heading
                eyebrow="YOUR CIRCLE, CONNECTED"
                title="Alerts & little updates"
                description="A timeline of simulated check-ins, guidance, and requests for support."
                action={
                  <button
                    className="button light"
                    onClick={() => useStore.getState().read()}
                  >
                    Mark all as read <Check size={17} />
                  </button>
                }
              />
              <section className="card">
                <Alerts />
              </section>
            </>
          }
        />
        <Route
          path="twin"
          element={
            <>
              <Heading
                eyebrow="A SHARED MOMENT"
                title="Their companion. Your reassurance."
                description="A live digital twin of the wearable, reflecting the same shared simulation state."
                action={<Badge />}
              />
              <section className="card twin-stage">
                {memorySession && (
                  <div className="memory-notice">
                    Memory Garden ·{" "}
                    {memorySession.paused
                      ? "Paused — progress preserved"
                      : "Activity in progress"}
                    . <Link to="/caregiver/library">View shared moments</Link>
                  </div>
                )}
                <Wearable />
                <Link className="button light" to="/demo">
                  Change the scenario <ArrowRight size={16} />
                </Link>
              </section>
            </>
          }
        />
        <Route path="landmarks" element={<Landmarks />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="emergency" element={<EmergencyAssistance />} />
        <Route path="library" element={<CaregiverMemoryLibrary />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}
function NotFound() {
  return (
    <div className="empty">
      <Compass size={40} />
      <h1>Let's find our way back.</h1>
      <Link className="button" to="/">
        Return to WayHome
      </Link>
    </div>
  );
}
export default function App() {
  return (
    <HashRouter>
      <RouteFocus />
      <CheckInRuntime />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/companion" element={<Companion />} />
        <Route path="/memories" element={<MemoryGardenHome />} />
        <Route
          path="/memory-demo"
          element={
            <Shell>
              <MemoryGardenDemo />
            </Shell>
          }
        />
        <Route path="/caregiver/*" element={<CaregiverRoutes />} />
        <Route
          path="/demo"
          element={
            <Shell>
              <DemoControls />
            </Shell>
          }
        />
        <Route
          path="/guided"
          element={
            <Shell>
              <Guided />
            </Shell>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}
