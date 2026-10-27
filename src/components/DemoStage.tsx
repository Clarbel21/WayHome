import { useEffect, useState } from "react";
import {
  Footprints,
  MapPinOff,
  PauseCircle,
  SatelliteDish,
  Watch,
  WifiOff,
  BatteryLow,
  ShieldAlert,
  RotateCcw,
  Home,
  Route,
  MapPinned,
  FastForward,
} from "lucide-react";
import { useStore } from "../store";
import { useLang, type Lang } from "../i18n";
import { useZone } from "../zone/store";

type Moment = {
  id: string;
  label: Record<Lang, string>;
  watch: Record<Lang, string>;
  icon: typeof Home;
  run: () => void;
  allowedInSos?: boolean;
  needsCalm?: boolean;
  tone?: "sos";
};

// One-click presenter moments. Each calls an existing store action, so every
// guard (SOS precedence, blocked reset, wear inference) still applies.
export function DemoStage() {
  const s = useStore();
  const lang = useLang((l) => l.lang);
  const [last, setLast] = useState<Moment | null>(null);
  const sos = s.mode === "EMERGENCY_SIMULATED";
  const zone = useZone();
  const incidentOpen = sos || (!!s.incident && s.incident.stage !== "resolved");
  // Guidance moments begin from a clean scenario so leftover readings from earlier
  // moments (route deviation, removal, weak GPS, open family request...) can't block
  // "Take me home". Never possible during an open SOS: that must be resolved first.
  const fresh = (start: () => void) => () => {
    if (incidentOpen) return;
    s.reset();
    start();
  };
  const moments: Moment[] = [
    {
      id: "zone-out",
      label: { en: "Walk out of safe zone", id: "Keluar zona aman" },
      watch: {
        en: "The dot crosses the radius. The watch vibrates and asks “Heading home?”. The phone shows the escalation ladder.",
        id: "Titik melewati radius. Jam bergetar dan bertanya “Mau pulang?”. Ponsel menampilkan tahap eskalasi.",
      },
      icon: Route,
      run: fresh(() => useZone.getState().wanderOut()),
      needsCalm: true,
    },
    {
      id: "zone-lost",
      label: { en: "Lost far from home", id: "Tersesat jauh" },
      watch: {
        en: "Jumps well outside the zone. Tap “Yes, take me home” to start landmark-by-landmark guidance.",
        id: "Langsung jauh di luar zona. Ketuk “Ya, antar aku pulang” untuk panduan tempat demi tempat.",
      },
      icon: MapPinned,
      run: fresh(() => useZone.getState().lostFar()),
      needsCalm: true,
    },
    {
      id: "zone-ffwd",
      label: { en: "+8 min", id: "+8 mnt" },
      watch: {
        en: "Fast-forwards time outside the zone so the next ladder step fires: notify, then call, then a simulated emergency.",
        id: "Mempercepat waktu di luar zona agar tahap berikutnya berjalan: beri tahu, telepon, lalu darurat simulasi.",
      },
      icon: FastForward,
      run: () => zone.fastForward(8),
    },
    {
      id: "walk",
      label: { en: "Walk home", id: "Jalan pulang" },
      watch: {
        en: "Watch shows the first familiar landmark. Phone tracks each stop.",
        id: "Jam menunjukkan tempat pertama. Ponsel mengikuti setiap tempat.",
      },
      icon: Footprints,
      run: fresh(() => useStore.getState().chooseAssistance("home")),
      needsCalm: true,
    },
    {
      id: "deviation",
      label: { en: "Wanders off route", id: "Keluar rute" },
      watch: {
        en: "Watch switches to a calm breathe-with-me screen and offers family. Phone turns amber and explains why.",
        id: "Jam beralih ke layar tenang untuk bernapas bersama dan menawarkan keluarga. Ponsel berubah kuning dan menjelaskan alasannya.",
      },
      icon: MapPinOff,
      run: () => s.simulateScenario("deviation"),
    },
    {
      id: "inactivity",
      label: { en: "Stops moving", id: "Berhenti bergerak" },
      watch: {
        en: "A calm check-in. Rest is possible, so nothing is escalated yet.",
        id: "Sapaan tenang. Mungkin sedang istirahat, jadi belum ada eskalasi.",
      },
      icon: PauseCircle,
      run: () => s.simulateScenario("inactivity"),
    },
    {
      id: "gps",
      label: { en: "Weak GPS", id: "GPS lemah" },
      watch: {
        en: "Directions pause instead of guessing. Phone shows low confidence.",
        id: "Arahan dijeda, bukan menebak. Ponsel menunjukkan keyakinan rendah.",
      },
      icon: SatelliteDish,
      run: () => s.simulateScenario("gps"),
    },
    {
      id: "remove",
      label: { en: "Takes it off", id: "Dilepas" },
      watch: {
        en: "Watch offers to contact family. Phone asks for a caregiver review.",
        id: "Jam menawarkan menghubungi keluarga. Ponsel meminta pemeriksaan.",
      },
      icon: Watch,
      run: () => s.event("REMOVE"),
      allowedInSos: true,
    },
    {
      id: "offline",
      label: { en: "Loses signal", id: "Sinyal hilang" },
      watch: {
        en: "Watch shows Offline. Phone keeps the last known location.",
        id: "Jam menunjukkan Offline. Ponsel menyimpan lokasi terakhir.",
      },
      icon: WifiOff,
      run: () => s.event("DISCONNECT"),
      allowedInSos: true,
    },
    {
      id: "battery",
      label: { en: "Low battery", id: "Baterai lemah" },
      watch: {
        en: "Battery icon turns red. Phone suggests charging tonight.",
        id: "Ikon baterai merah. Ponsel menyarankan mengisi daya.",
      },
      icon: BatteryLow,
      run: () => {
        useStore.setState({ battery: 12 });
        s.recordActivity("Battery low (12%) · simulated reading");
      },
      allowedInSos: true,
    },
    {
      id: "sos",
      label: { en: "SOS", id: "SOS" },
      watch: {
        en: "Watch turns red and shows who has seen it. Phone asks for acknowledgment.",
        id: "Jam menjadi merah dan menunjukkan siapa yang sudah melihat. Ponsel meminta konfirmasi.",
      },
      icon: ShieldAlert,
      run: () => s.event("SOS"),
      allowedInSos: true,
      tone: "sos",
    },
  ];
  return (
    <div className="demo-stage">
      <div
        className="demo-stage-chips"
        role="toolbar"
        aria-label="Demo moments"
      >
        <span className="demo-stage-label">
          {lang === "id" ? "Coba momen" : "Try a moment"}
        </span>
        {moments.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`demo-chip ${m.tone ?? ""} ${m.id.startsWith("zone") ? "zone" : ""} ${last?.id === m.id ? "active" : ""}`}
            disabled={
              (sos && !m.allowedInSos) ||
              (m.needsCalm && incidentOpen) ||
              (m.id === "zone-ffwd" && !zone.active)
            }
            title={
              m.needsCalm && incidentOpen
                ? "Resolve and verify the SOS first (Help received on the watch)"
                : undefined
            }
            onClick={() => {
              m.run();
              setLast(m);
            }}
          >
            <m.icon size={15} aria-hidden="true" />
            {m.label[lang]}
          </button>
        ))}
        <button
          type="button"
          className="demo-chip reset"
          disabled={sos || (!!s.incident && s.incident.stage !== "resolved")}
          title={
            sos
              ? "Resolve and verify the SOS in Emergency Assistance first"
              : undefined
          }
          onClick={() => {
            s.reset();
            setLast(null);
          }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          {lang === "id" ? "Atur ulang" : "Reset demo"}
        </button>
      </div>
      <p className="demo-stage-caption" aria-live="polite">
        {last
          ? last.watch[lang]
          : incidentOpen && !sos
            ? lang === "id"
              ? "SOS sebelumnya belum diverifikasi. Selesaikan di Bantuan Darurat sebelum memulai perjalanan pulang."
              : "An earlier SOS still needs verification. Finish it in Emergency Assistance before starting a walk home."
            : sos
              ? lang === "id"
                ? "SOS aktif. Konfirmasi di ponsel, lalu selesaikan di jam setelah bantuan tiba."
                : "SOS is active. Acknowledge on the phone, then resolve on the watch once help has arrived."
              : lang === "id"
                ? "Klik satu momen dan lihat jam serta ponsel bereaksi bersama."
                : "Click a moment and watch both devices respond together."}
      </p>
    </div>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {(["en", "id"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          lang={l}
        >
          {l === "en" ? "EN" : "ID"}
        </button>
      ))}
    </div>
  );
}
