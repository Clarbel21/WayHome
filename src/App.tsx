import { CareRuntime, Contacts, SafetyPolicy } from "./care/Tools";
import { JourneyPlayer } from "./care/JourneyPlayer";
import { Landmarks } from "./care/Landmarks";
import { CaregiverPhone } from "./components/CaregiverPhone";
import "./interfaces.css";
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
  Phone,
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
import { useStore, status, type Event } from "./store";
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
import { DemoStage, LangSwitch } from "./components/DemoStage";
import { useT } from "./i18n";
import { ZoneRuntime } from "./zone/ZoneRuntime";
import { useZone } from "./zone/store";
import { UpdateNotice, buildLabel } from "./components/UpdateNotice";
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
    ["/together", "Side-by-side view", Monitor],
    ["/caregiver/landmarks", "Familiar landmarks", Compass],
    ["/caregiver/library", "Memory Library", Leaf],
    ["/caregiver/contacts", "Contacts", Phone],
    ["/caregiver/policy", "Safety policy", ShieldCheck],
    ["/caregiver/settings", "Settings", Settings],
    ["/demo", "Demo control center", Sparkles],
  ] as const;
  return (
    <div
      className={`app care-workspace ${s.settings.largeText ? "large-text" : ""} ${s.settings.reducedMotion ? "reduce-motion" : ""}`}
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
          <span>
            WayHome · Moonshot 101 · Educational prototype · {buildLabel}
          </span>
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
  const zoneActive = useZone((z) => z.active);
  const tone =
    s.mode === "EMERGENCY_SIMULATED"
      ? "urgent"
      : s.mode === "NORMAL" && s.connected && s.worn && !zoneActive
        ? "calm"
        : "attention";
  return (
    <>
      <Heading
        eyebrow="A LITTLE PEACE OF MIND"
        title={`Looking out for ${s.settings.wearer.split(" ")[0]}.`}
        description="A familiar companion. A reassuring connection. You're in this together."
        action={
          <div className="button-row">
            <Link className="button light" to="/together">
              <Monitor size={17} />
              Open live stage
            </Link>
            <Link className="button light" to="/guided">
              <Sparkles size={17} />
              Start Guided Demo
            </Link>
          </div>
        }
      />
      <div className={`welcome-banner tone-${tone}`}>
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
        {tone === "calm" ? (
          <Badge />
        ) : (
          <Link
            className="button banner-action"
            to={
              s.mode === "EMERGENCY_SIMULATED"
                ? "/caregiver/emergency"
                : "/caregiver/alerts"
            }
          >
            {s.mode === "EMERGENCY_SIMULATED"
              ? "Review SOS"
              : s.familyRequest && s.familyRequest.status !== "responded"
                ? "Answer family request"
                : "Review alerts"}
            <ArrowRight size={15} />
          </Link>
        )}
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
            <span
              className={`alert-icon ${a.emergency ? "urgent" : a.urgent ? "attention" : ""}`}
            >
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
      <section className="card demo-quick">
        <div className="card-heading">
          <div>
            <h2>Quick moments</h2>
            <p>
              One click per situation. Open the live stage to see the watch and
              phone side by side.
            </p>
          </div>
          <Link className="button light" to="/together">
            <Monitor size={17} />
            Open live stage
          </Link>
        </div>
        <DemoStage />
      </section>
      <CheckInDemo />
      <div className="demo-layout">
        <div>
          <div className="scenario-grid">
            {actions.map((a, i) => (
              <button
                className={`scenario ${a.event === "SOS" ? "sos-scenario" : ""}`}
                key={a.event}
                disabled={
                  s.mode === "EMERGENCY_SIMULATED" &&
                  !["SOS", "REMOVE", "DISCONNECT"].includes(a.event)
                }
                onClick={() =>
                  a.event === "OKAY"
                    ? s.answerCheckIn("okay")
                    : s.event(a.event)
                }
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
  const location = useLocation();
  const s = useStore();
  const t = useT();
  return (
    <div
      className={`companion-page shared-experience ${s.settings.largeText ? "large-text" : ""} ${s.settings.reducedMotion ? "reduce-motion" : ""}`}
    >
      <header className="public-header">
        <Brand />
        <div className="stage-header-actions">
          <LangSwitch />
          <Link to="/demo" className="text-button">
            {t("demoControls")} <ArrowRight size={16} />
          </Link>
          <Link className="text-button" to="/" onClick={s.closeDemo}>
            {t("exitDemo")}
          </Link>
          <Link className="button light" to="/caregiver">
            <LayoutDashboard size={17} />
            {t("caregiverMode")}
          </Link>
        </div>
      </header>
      <main className="companion-main viewport-stage">
        <div className="stage-heading">
          <div className="eyebrow">A FAMILIAR FRIEND, ALWAYS NEAR</div>
          <h1>
            {t("stageTitle")}
            <br />
            <em>{t("stageEm")}</em>
          </h1>
          <p>A little reassurance, wherever the day takes you.</p>
        </div>
        <div className="shared-devices">
          <section
            className="wearer-interface"
            aria-labelledby="wearer-view-title"
          >
            <div className="device-caption">
              <span>01 / COMPANION</span>
              <h2 id="wearer-view-title" tabIndex={-1}>
                {t("familiarFriend")}
              </h2>
              <p>{s.settings.wearer}'s interface</p>
            </div>
            <Wearable />
            <Link
              className="button explore-memories"
              to="/memories"
              state={{ from: location.pathname }}
              aria-describedby={
                !safetyReady() ? "memories-availability" : undefined
              }
            >
              <Leaf size={23} />
              {t("exploreMemories")}
            </Link>
            {!safetyReady() && (
              <p
                id="memories-availability"
                className="companion-memory-notice"
                role="status"
              >
                Memory Garden is paused. Select Explore Memories to see why and
                open caregiver review.
              </p>
            )}
          </section>
          <section
            className="caregiver-interface"
            aria-labelledby="caregiver-view-title"
          >
            <div className="device-caption">
              <span>02 / CAREGIVER</span>
              <h2 id="caregiver-view-title">{t("littleCloser")}</h2>
              <p>{s.settings.caregiver}'s phone interface</p>
            </div>
            <CaregiverPhone />
          </section>
        </div>
        <div className="stage-toolbar">
          <DemoStage />
          <div className="companion-foot">
            <ShieldCheck size={15} /> Educational simulation · no real emergency
            calls · {buildLabel}
          </div>
        </div>
      </main>
    </div>
  );
}
const steps = [
  {
    title: "A little independence",
    body: "Alex is out on a neighborhood walk. The watch shows four large choices — Go home, Call family, Talk and Memories — and the caregiver’s phone is green: All calm.",
    event: "WALK",
  },
  {
    title: "A gentle check-in",
    body: "A gentle check-in arrives. {companion} asks “How are you feeling?” with two large answers. The phone shows it is waiting for Alex — no alarm, no pressure.",
    event: "CHECK",
  },
  {
    title: "A moment of uncertainty",
    body: "Alex feels unsure. {companion} switches to a calm screen — “It’s okay. I’m here with you.” — with a slow breathing circle. The phone turns amber: Check-in Needed.",
    event: "LOST",
  },
  {
    title: "Let’s find something familiar",
    body: "{companion} shows a familiar place and offers to contact family. Nothing has to be remembered right now — familiar places support reorientation.",
    event: "LOST",
  },
  {
    title: "A place Alex knows",
    body: "Guidance starts. The watch shows Stop 1 of 4: one landmark photo and one simple instruction. The phone shows the route home, stop by stop.",
    event: "GUIDE",
  },
  {
    title: "One confident step",
    body: "Try it: select “I see it” on the watch. The next landmark appears and the phone’s route strip moves forward. “I don’t see it” stops directions safely and offers family.",
    event: "GUIDE",
  },
  {
    title: "Connected through the journey",
    body: "Alex confirms feeling okay. The phone returns to green and the check-in is saved with a timestamp under Updates.",
    event: "OKAY",
  },
  {
    title: "An alternate path to support",
    body: "In this alternate scenario Alex holds SOS for two seconds. The watch turns red and shows Sent → Seen; the phone asks the caregiver to acknowledge. No real emergency services are contacted.",
    event: "SOS",
  },
] as const;
function Guided() {
  const s = useStore();
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  function go(i: number) {
    if (s.mode === "EMERGENCY_SIMULATED") return;
    setIndex(i);
    setStarted(true);
    if (steps[i].event === "OKAY") s.answerCheckIn("okay");
    else s.event(steps[i].event);
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
                disabled={s.mode === "EMERGENCY_SIMULATED"}
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
              Presenter tip: spend about 15–20 seconds on each step. The watch
              and phone are live — tap them during the story. For free
              exploration, open the side-by-side stage.
            </p>
          </div>
          <Badge />
          <div className="button-row">
            <button
              className="button light"
              disabled={index === 0 || s.mode === "EMERGENCY_SIMULATED"}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={17} />
              Back
            </button>
            <button
              className="button"
              onClick={() => go(!started ? 0 : Math.min(7, index + 1))}
              disabled={
                (started && index === 7) || s.mode === "EMERGENCY_SIMULATED"
              }
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
            disabled={s.mode === "EMERGENCY_SIMULATED"}
            onClick={() => {
              if (s.mode === "EMERGENCY_SIMULATED") return;
              s.reset();
              setStarted(false);
              setIndex(0);
            }}
          >
            <RotateCcw size={15} />
            Reset presentation
          </button>
          <Link className="button light" to="/companion" onClick={s.closeDemo}>
            Exit walkthrough
          </Link>
          {s.mode === "EMERGENCY_SIMULATED" && (
            <Link className="text-button" to="/caregiver/emergency">
              Resolve and verify S5 before restarting the walk →
            </Link>
          )}
          <Link className="text-button" to="/together">
            Open side-by-side stage <ArrowRight size={15} />
          </Link>
          <Link className="text-button" to="/caregiver">
            See caregiver dashboard <ArrowRight size={15} />
          </Link>
        </section>
        <section className="card demo-twin guided-devices">
          <div>
            <div className="eyebrow">WHAT ALEX SEES</div>
            <Wearable compact />
          </div>
          <div>
            <div className="eyebrow">
              WHAT {s.settings.caregiver.split(" ")[0].toUpperCase()} SEES
            </div>
            <CaregiverPhone />
          </div>
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
        <Route path="contacts" element={<Contacts />} />
        <Route path="policy" element={<SafetyPolicy />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="emergency" element={<EmergencyAssistance />} />
        <Route
          path="library"
          element={
            <>
              <Link className="button light" to="/together">
                Close Memory Library
              </Link>
              <CaregiverMemoryLibrary />
            </>
          }
        />
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
      <UpdateNotice />
      <CheckInRuntime />
      <ZoneRuntime />
      <CareRuntime />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/companion" element={<Companion />} />
        <Route path="/together" element={<Companion />} />
        <Route path="/journeys/:id" element={<JourneyPlayer />} />
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
