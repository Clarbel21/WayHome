import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { sampleEntries, useMemory } from "./store";
import { MemoryGardenExperience } from "./MemoryPlayer";
const scenario = [
  [
    "An invitation to connect",
    "Invite the wearer to share a happy memory with their companion.",
  ],
  [
    "A familiar face",
    "Open Familiar Faces. Only this explicitly prepared, approved sample is used.",
  ],
  [
    "A gentle recognition prompt",
    "The fictional family illustration appears. Its name is not shown before the reveal.",
  ],
  [
    "Tell me more",
    "The wearer asks for the caregiver-approved story. No answers are marked wrong.",
  ],
  [
    "A shared memory",
    "The companion reveals the fictional daughter and a happy visit to the park.",
  ],
  [
    "A flower grows",
    "The completed interaction adds a keepsake. The caregiver history records the moment.",
  ],
  ["Another happy place", "Open My Happy Places, separate from navigation."],
  [
    "A familiar setting",
    "The wearer asks about the fictional park, and a second keepsake grows.",
  ],
  [
    "A circle of care",
    "The caregiver can see selected and completed activities, with timestamps and no cognitive scores.",
  ],
  [
    "Safety comes first",
    "A simulated SOS immediately pauses the activity and updates the caregiver alert and digital twin. No emergency services are contacted.",
  ],
];
export function MemoryGardenDemo() {
  const [index, setIndex] = useState(0);
  const [ids, setIds] = useState<{ face: string; place: string } | null>(null);
  const m = useMemory();
  const s = useStore();
  const [notice, setNotice] = useState("");
  function prepare() {
    if (s.mode !== "NORMAL" || !s.connected || !s.worn) {
      setNotice(
        "Resolve or reset the safety simulation in Emergency Assistance before starting this sample scenario.",
      );
      return;
    }
    const face = { ...sampleEntries[0], id: ids?.face || crypto.randomUUID() };
    const place = {
      ...sampleEntries[1],
      id: ids?.place || crypto.randomUUID(),
    };
    m.saveEntry(face);
    m.saveEntry(place);
    setIds({ face: face.id, place: place.id });
    m.invite();
    setIndex(0);
    setNotice(
      "Approved fictional sample copies prepared. Your existing memories, history and garden are preserved.",
    );
  }
  function go(i: number) {
    if (!ids) return;
    if (s.mode === "EMERGENCY_SIMULATED") {
      setNotice(
        "S5 stays active. Request incident resolution and complete caregiver verification, then return to this demonstration.",
      );
      return;
    }
    setIndex(i);
    if (i === 0) m.invite();
    if (i >= 1 && i <= 2) m.start("faces", ids.face);
    if (i >= 3 && i <= 5) {
      if (m.session?.entryId !== ids.face || !m.session.completed)
        m.start("faces", ids.face);
      m.respond("Tell me more");
    }
    if (i === 6) m.start("places", ids.place);
    if (i === 7) {
      m.start("places", ids.place);
      m.respond("Tell me about it");
    }
    if (i === 8) m.home();
    if (i === 9) {
      m.start("faces", ids.face);
      s.event("SOS");
    }
    setNotice("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A GUIDED STORY OF CONNECTION</div>
          <h1>Memory Garden Demo</h1>
          <p>Fictional sample content · presenter-led · no timers or scores.</p>
        </div>
      </div>
      <div className="guided-layout">
        <section className="card guided-story">
          <span className="subtle-tag">STEP {index + 1} OF 10</span>
          <h2>{scenario[index][0]}</h2>
          <p>{scenario[index][1]}</p>
          <div className="progress-track">
            <div style={{ width: `${(index + 1) * 10}%` }} />
          </div>
          {!ids ? (
            <button className="button" onClick={prepare}>
              Prepare sample demo
            </button>
          ) : (
            <div className="button-row">
              <button
                className="button light"
                disabled={index === 0}
                onClick={() => go(index - 1)}
              >
                Back
              </button>
              <button
                className="button"
                disabled={index === 9}
                onClick={() => go(index + 1)}
              >
                Next
              </button>
              <button className="button light" onClick={prepare}>
                Reset sample scenario
              </button>
            </div>
          )}
          <p role="status" className="memory-notice">
            {notice}
          </p>
          <p className="help-text">
            The wearable area is interactive. Back revisits the sample activity;
            completed interactions remain in your garden. Reset prepares fresh
            activity state without erasing history or clearing S5.
          </p>
          <Link className="text-button" to="/caregiver/library">
            See activity history →
          </Link>
          <Link className="text-button" to="/caregiver/emergency">
            Emergency Assistance →
          </Link>
        </section>
        <div className="card memory-demo-player">
          <MemoryGardenExperience embedded />
        </div>
      </div>
    </>
  );
}
