// Lightweight EN/ID language layer for wearer-facing and caregiver-phone text.
// English strings are the source of truth and match the store's existing messages,
// so persisted data, alerts and tests stay in English. Indonesian is a UI rendering only.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Mode } from "./store";

export type Lang = "en" | "id";

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist((set) => ({ lang: "en", setLang: (lang) => set({ lang }) }), {
    name: "wayhome-lang-v1",
  }),
);

type Dict = Record<string, string>;

// Keys are short ids; {name}-style placeholders are filled by t().
const en: Dict = {
  goHome: "Go home",
  callFamily: "Call family",
  talk: "Talk",
  memories: "Memories",
  sosHold: "Hold for 2 seconds",
  sosKeep: "Keep holding…",
  okay: "I'm okay",
  needHelp: "I need help",
  howHelp: "How can I help?",
  helpHome: "Help me get home",
  helpFamily: "Contact my family",
  helpConfused: "I'm confused",
  backCheckIn: "Back to check-in",
  checkInHint: "Take your time. Tap one.",
  iSeeIt: "I see it",
  iDontSeeIt: "I don't see it",
  seeItNow: "I see it now",
  callMyFamily: "Call my family",
  cancelGuidance: "Cancel guidance",
  stopOf: "Stop {n} of {total}",
  approx: "About {m} m · simulated",
  lookFor: "Look for",
  guidancePaused:
    "Guidance paused. Ask your caregiver to review attachment and location readings.",
  noLandmarks: "No approved landmarks yet.",
  contactCaregiver: "Contact my caregiver",
  breathe: "Breathe in… and out.",
  takeTime: "Take your time. You don't need to remember anything right now.",
  stepSent: "Sent",
  stepSeen: "Seen",
  stepComing: "Responding",
  waitingCaregiver: "Waiting for caregiver response",
  caregiverSeen: "Your caregiver has seen your request.",
  caregiverResponded:
    "{caregiver} has responded in this demo. They are here to help.",
  needsReview: "Your caregiver needs to review this concern.",
  continueAfter: "Continue after response",
  notifSent: "Caregiver notification sent — simulation. No real call was made.",
  notifNone: "No real call or message has been sent.",
  sosTitle: "Help is on the way",
  sosNotified:
    "{caregiver} and {emergency} are shown as notified in this demo.",
  sosNoReal: "No real calls or emergency messages are sent.",
  sosAcked: "{caregiver} has seen your SOS",
  sosWaiting: "Waiting for {caregiver} to see it",
  stayHere: "Stay where you are. You are not alone.",
  talkIntro:
    "I'm here to keep you company. We can take a quiet moment together.",
  talkComfort: "Take your time. You are welcome here, just as you are.",
  talkWhere: "Where am I?",
  talkWhereReply:
    "You're on a familiar walk near home. I can guide you, or call your family.",
  talkWho: "Who is my family?",
  talkWhoReply: "{caregiver} cares about you and is one tap away.",
  somethingComforting: "Something comforting",
  backHome: "Back to wearable home",
  openGarden: "Open Memory Garden",
  returnHome: "Return to wearable home",
  offline: "Offline",
  // phone
  allCalm: "All calm",
  needsAttention: "Needs attention",
  urgent: "Urgent",
  sendCheckIn: "Send a check-in",
  findBand: "Find My",
  findTitle: "Find My is ringing {companion}",
  findBody: "{caregiver} is looking for the band (simulated Find My).",
  findStop: "Stop ringing",
  findNote:
    "Find My is ringing and vibrating the band. Stop it here or on the watch.",
  findOffline: "The band is offline, so it cannot ring right now.",
  waitingAnswer: "Waiting for {wearer} to answer…",
  walkingHome: "{wearer} is walking home",
  nextStop: "Next stop: {place}",
  routeLabel: "Route home",
  device: "Device",
  wear: "Wear",
  battery: "Battery",
  gps: "GPS",
  connected: "Connected",
  disconnected: "Disconnected",
  lowBattery: "Battery is low ({n}%). Remind {wearer} to charge tonight.",
  whyAttention: "Why this needs attention",
  sosTimeline: "SOS progress",
  tlSent: "SOS received",
  tlAcked: "You acknowledged",
  tlResolved: "Resolved after you confirm help arrived",
  justNow: "just now",
  minAgo: "{n} min ago",
  zoneTitle: "Heading home?",
  zoneText: "{name}, you are a little far from home. Shall I guide you back?",
  zoneDistance: "{km} km from home",
  zoneYes: "Yes, take me home",
  zoneNo: "No, I'm fine",
  goStraight: "Go straight ahead",
  turnRight: "Turn right",
  turnLeft: "Turn left",
  walkToward: "Then about {m} m · simulated",
  headingTo: "Walking toward",
  doYouSee: "Do you see the {name}?",
  zoneOutside: "Outside the safe zone",
  zoneFor: "{min} min outside · {km} km from home",
  zoneGuiding: "Guiding home · escalation paused",
  zoneLadder: "Escalation ladder",
  zl1: "Check-in on the watch",
  zl2: "Notify {name}",
  zl3: "SMS and call {name}",
  zl4: "Emergency services (simulated)",
  zoneNow: "now",
  safeRadius: "Safe radius",
  zoneInside: "Inside the safe zone",
  routeLive: "Live · simulated",
  routeNext: "Next: {name} · {m} m",
  routeArrived: "Arriving home",
  routeLeft: "{m} m from home",
  turnRightAt: "Turn right at the {name}",
  turnLeftAt: "Turn left at the {name}",
  legToward: "{m} m to the {name}",
  markAllRead: "Mark all read",
  hello: "Hello, {name}.",
  circle: "YOUR CIRCLE OF CARE",
  reassureTitle: "A little reassurance.",
  reassureBody:
    "Ask how they're feeling. Their response appears in the companion interface.",
  attention: "Your attention matters.",
  ackSos: "Acknowledge SOS alert",
  reviewSos: "Review SOS",
  lastKnown: "Last known location",
  navToday: "Today",
  navUpdates: "Updates",
  navTools: "Care tools",
  updatesTitle: "Little moments. Shared.",
  stageTitle: "Here with you.",
  stageEm: "Connected by care.",
  exploreMemories: "Explore Memories",
  demoControls: "Explore demo controls",
  exitDemo: "Exit demonstration",
  caregiverMode: "Caregiver Mode",
  familiarFriend: "A familiar friend.",
  littleCloser: "A little closer.",
  sosAckRecorded:
    "SOS acknowledgment recorded. Resolution still needs caregiver verification.",
  respondFirst:
    "Respond to the family request below before sending another check-in.",
  calmSub: "A little support, whenever it’s needed.",
  sosSub:
    "A simulated SOS needs your review. Acknowledgment does not resolve it.",
  familySub: "Your family member asked for you.",
  changedSub: "Something changed. Review the details below.",
  workspace: "Open caregiver workspace",
  demoOnly: "Demo only. No real calls or notifications.",
};

const id: Dict = {
  goHome: "Pulang",
  callFamily: "Telepon keluarga",
  talk: "Bicara",
  memories: "Kenangan",
  sosHold: "Tahan 2 detik",
  sosKeep: "Terus tahan…",
  okay: "Saya baik-baik saja",
  needHelp: "Saya butuh bantuan",
  howHelp: "Apa yang bisa saya bantu?",
  helpHome: "Bantu saya pulang",
  helpFamily: "Hubungi keluarga saya",
  helpConfused: "Saya bingung",
  backCheckIn: "Kembali",
  checkInHint: "Pelan-pelan saja. Pilih satu.",
  iSeeIt: "Saya melihatnya",
  iDontSeeIt: "Saya tidak melihatnya",
  seeItNow: "Sekarang saya melihatnya",
  callMyFamily: "Telepon keluarga saya",
  cancelGuidance: "Batalkan panduan",
  stopOf: "Tempat {n} dari {total}",
  approx: "Sekitar {m} m · simulasi",
  lookFor: "Cari",
  guidancePaused:
    "Panduan dijeda. Minta pendamping memeriksa pemakaian dan lokasi perangkat.",
  noLandmarks: "Belum ada tempat yang disetujui.",
  contactCaregiver: "Hubungi pendamping saya",
  breathe: "Tarik napas… lalu hembuskan.",
  takeTime: "Pelan-pelan saja. Kamu tidak perlu mengingat apa pun sekarang.",
  stepSent: "Terkirim",
  stepSeen: "Dilihat",
  stepComing: "Menanggapi",
  waitingCaregiver: "Menunggu tanggapan pendamping",
  caregiverSeen: "Pendampingmu sudah melihat permintaanmu.",
  caregiverResponded:
    "{caregiver} sudah menanggapi dalam demo ini. Mereka siap membantu.",
  needsReview: "Pendampingmu perlu memeriksa hal ini.",
  continueAfter: "Lanjutkan",
  notifSent: "Pemberitahuan terkirim — simulasi. Tidak ada panggilan nyata.",
  notifNone: "Belum ada panggilan atau pesan nyata yang dikirim.",
  sosTitle: "Bantuan sedang diminta",
  sosNotified:
    "{caregiver} dan {emergency} ditampilkan sebagai sudah diberi tahu dalam demo ini.",
  sosNoReal: "Tidak ada panggilan darurat nyata yang dikirim.",
  sosAcked: "{caregiver} sudah melihat SOS-mu",
  sosWaiting: "Menunggu {caregiver} melihatnya",
  stayHere: "Tetap di tempatmu. Kamu tidak sendirian.",
  talkIntro: "Aku di sini menemanimu. Kita bisa diam sejenak bersama.",
  talkComfort: "Pelan-pelan saja. Kamu diterima di sini, apa adanya.",
  talkWhere: "Saya di mana?",
  talkWhereReply:
    "Kamu sedang berjalan di dekat rumah. Aku bisa memandu, atau menelepon keluargamu.",
  talkWho: "Siapa keluarga saya?",
  talkWhoReply:
    "{caregiver} menyayangimu dan bisa dihubungi dengan satu sentuhan.",
  somethingComforting: "Sesuatu yang menenangkan",
  backHome: "Kembali ke layar utama",
  openGarden: "Buka Taman Kenangan",
  returnHome: "Kembali ke layar utama",
  offline: "Offline",
  allCalm: "Semua tenang",
  needsAttention: "Perlu perhatian",
  urgent: "Mendesak",
  sendCheckIn: "Kirim sapaan",
  findBand: "Find My",
  findTitle: "Find My sedang membunyikan {companion}",
  findBody: "{caregiver} mencari gelang ini (Find My simulasi).",
  findStop: "Hentikan bunyi",
  findNote:
    "Find My membunyikan dan menggetarkan gelang. Hentikan di sini atau di jam tangan.",
  findOffline: "Gelang sedang offline, jadi tidak bisa dibunyikan sekarang.",
  waitingAnswer: "Menunggu jawaban {wearer}…",
  walkingHome: "{wearer} sedang berjalan pulang",
  nextStop: "Tempat berikutnya: {place}",
  routeLabel: "Rute pulang",
  device: "Perangkat",
  wear: "Dipakai",
  battery: "Baterai",
  gps: "GPS",
  connected: "Terhubung",
  disconnected: "Terputus",
  lowBattery: "Baterai lemah ({n}%). Ingatkan {wearer} untuk mengisi daya.",
  whyAttention: "Mengapa ini perlu perhatian",
  sosTimeline: "Perkembangan SOS",
  tlSent: "SOS diterima",
  tlAcked: "Kamu sudah mengonfirmasi",
  tlResolved: "Selesai setelah kamu memastikan bantuan tiba",
  justNow: "baru saja",
  minAgo: "{n} mnt lalu",
  zoneTitle: "Mau pulang?",
  zoneText: "{name}, kamu agak jauh dari rumah. Mau aku pandu pulang?",
  zoneDistance: "{km} km dari rumah",
  zoneYes: "Ya, antar aku pulang",
  zoneNo: "Tidak, aku baik-baik saja",
  goStraight: "Jalan lurus",
  turnRight: "Belok kanan",
  turnLeft: "Belok kiri",
  walkToward: "Lalu sekitar {m} m · simulasi",
  headingTo: "Menuju",
  doYouSee: "Apakah kamu melihat {name}?",
  zoneOutside: "Di luar zona aman",
  zoneFor: "{min} mnt di luar · {km} km dari rumah",
  zoneGuiding: "Memandu pulang · eskalasi dijeda",
  zoneLadder: "Tahap eskalasi",
  zl1: "Sapaan di jam",
  zl2: "Beri tahu {name}",
  zl3: "SMS dan telepon {name}",
  zl4: "Layanan darurat (simulasi)",
  zoneNow: "sekarang",
  safeRadius: "Radius aman",
  zoneInside: "Di dalam zona aman",
  routeLive: "Langsung · simulasi",
  routeNext: "Berikutnya: {name} · {m} m",
  routeArrived: "Hampir sampai rumah",
  routeLeft: "{m} m dari rumah",
  turnRightAt: "Belok kanan di {name}",
  turnLeftAt: "Belok kiri di {name}",
  legToward: "{m} m ke {name}",
  markAllRead: "Tandai semua dibaca",
  hello: "Halo, {name}.",
  circle: "LINGKARAN PEDULI ANDA",
  reassureTitle: "Sedikit ketenangan.",
  reassureBody: "Tanyakan perasaannya. Jawabannya muncul di layar pendamping.",
  attention: "Perhatian Anda penting.",
  ackSos: "Konfirmasi SOS",
  reviewSos: "Tinjau SOS",
  lastKnown: "Lokasi terakhir",
  navToday: "Hari ini",
  navUpdates: "Kabar",
  navTools: "Alat peduli",
  updatesTitle: "Momen kecil. Dibagikan.",
  stageTitle: "Di sini bersamamu.",
  stageEm: "Terhubung oleh kasih.",
  exploreMemories: "Jelajahi Kenangan",
  demoControls: "Kontrol demo",
  exitDemo: "Keluar dari demo",
  caregiverMode: "Mode Pendamping",
  familiarFriend: "Teman yang akrab.",
  littleCloser: "Sedikit lebih dekat.",
  sosAckRecorded:
    "Konfirmasi SOS tercatat. Penyelesaian masih perlu verifikasi pendamping.",
  respondFirst:
    "Tanggapi permintaan keluarga di bawah sebelum mengirim sapaan lagi.",
  calmSub: "Sedikit dukungan, kapan pun dibutuhkan.",
  sosSub: "SOS simulasi perlu Anda tinjau. Konfirmasi tidak menyelesaikannya.",
  familySub: "Anggota keluarga Anda meminta Anda.",
  changedSub: "Ada perubahan. Lihat detail di bawah.",
  workspace: "Buka ruang kerja pendamping",
  demoOnly: "Hanya demo. Tidak ada panggilan atau notifikasi nyata.",
};

const dicts: Record<Lang, Dict> = { en, id };

export function translate(
  lang: Lang,
  key: keyof typeof en,
  vars: Record<string, string | number> = {},
) {
  const raw = dicts[lang][key] ?? en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return (key: keyof typeof en, vars?: Record<string, string | number>) =>
    translate(lang, key, vars);
}

// Companion speech per mode. English matches store.messages() exactly.
export function modeMessage(lang: Lang, mode: Mode, name: string) {
  if (lang === "en") {
    return {
      NORMAL: `Hi! I'm ${name}. I'm here with you.`,
      CHECK_IN: "How are you feeling?",
      GUIDED_RETURN: "Let's find our way together.",
      REORIENTATION: "It's okay. I'm here with you.",
      CAREGIVER_HANDOVER: "Let's contact someone you trust.",
      EMERGENCY_SIMULATED: "Help request sent — simulation",
    }[mode];
  }
  return {
    NORMAL: `Hai! Aku ${name}. Aku di sini bersamamu.`,
    CHECK_IN: "Bagaimana perasaanmu?",
    GUIDED_RETURN: "Ayo kita cari jalan bersama.",
    REORIENTATION: "Tidak apa-apa. Aku di sini bersamamu.",
    CAREGIVER_HANDOVER: "Ayo hubungi orang yang kamu percaya.",
    EMERGENCY_SIMULATED: "Permintaan bantuan terkirim — simulasi",
  }[mode];
}

// Known store notes rendered in Indonesian; unknown notes fall back to English.
const notesId: Record<string, string> = {
  "Thank you for telling me. I'm here with you.":
    "Terima kasih sudah memberi tahu. Aku di sini bersamamu.",
  "Thank you for telling me. Your caregiver still needs to review the safety concern.":
    "Terima kasih. Pendampingmu masih perlu memeriksa hal ini.",
  "Let's take one step together.": "Ayo satu langkah bersama.",
  "These are simulated directions. Look for one familiar place at a time.":
    "Ini arahan simulasi. Cari satu tempat yang kamu kenal setiap kali.",
  "Guidance is paused while your caregiver reviews the current concern. I can't confirm the route.":
    "Panduan dijeda sementara pendamping memeriksa. Aku belum bisa memastikan rutenya.",
  "That's okay. We'll stop these directions. Your family can help.":
    "Tidak apa-apa. Kita hentikan arahan ini. Keluargamu bisa membantu.",
  "It's okay to feel unsure. Take your time. I'm here with you.":
    "Tidak apa-apa merasa ragu. Pelan-pelan saja. Aku di sini bersamamu.",
  "I'm here with you. When you're ready, tell me how you feel.":
    "Aku di sini bersamamu. Kalau sudah siap, ceritakan perasaanmu.",
  "You can answer whenever you're ready.":
    "Kamu bisa menjawab kapan saja kamu siap.",
  "Guidance cancelled. Your caregiver can help with any remaining concern.":
    "Panduan dibatalkan. Pendampingmu bisa membantu.",
  "This landmark was withdrawn. Directions have stopped. Please contact your family.":
    "Tempat ini ditarik. Arahan berhenti. Silakan hubungi keluargamu.",
};

export function noteText(lang: Lang, note: string) {
  return lang === "id" ? (notesId[note] ?? note) : note;
}

export function timeAgo(lang: Lang, time: number, now = Date.now()) {
  const m = Math.floor((now - time) / 60000);
  if (m < 1) return translate(lang, "justNow");
  if (m < 60) return translate(lang, "minAgo", { n: m });
  return new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
