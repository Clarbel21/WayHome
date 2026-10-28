import { LandmarkFamiliarity } from "../memory/WayHomePractice";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Compass, X, Check } from "lucide-react";
import { samples, useStore, type Landmark } from "../store";
import { LandmarkPhoto } from "../components/LandmarkPhoto";
import { putMedia, getMedia, validMedia } from "../memory/media";
import { useMemory } from "../memory/store";
function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
async function memoryApproval(l: Landmark) {
  const store = useMemory.getState(),
    id = `landmark-memory-${l.id}`,
    old = store.entries.find((e) => e.id === id);
  if (!l.memoryApproved) {
    if (old) store.saveEntry({ ...old, approved: false });
    return;
  }
  let imageId = old?.imageId;
  if (l.photoId && !imageId) {
    const blob = await getMedia(l.photoId);
    if (blob) {
      imageId = crypto.randomUUID();
      await putMedia(imageId, blob);
    }
  }
  store.saveEntry({
    id,
    kind: "places",
    title: l.name,
    description:
      l.recognition || l.notes || "A familiar place, shared at your own pace.",
    relationship: "",
    artist: "",
    steps: [],
    approved: true,
    sample: false,
    image: l.photo,
    imageId,
  });
}
export function Landmarks() {
  const s = useStore();
  const [editing, setEditing] = useState<Landmark | null>(null);
  const [error, setError] = useState("");
  const [upload, setUpload] = useState<File>();
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!editing) trigger.current?.focus();
  }, [!!editing]);
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || busy) return;
    if (!editing.name.trim() || !editing.instruction.trim()) {
      setError("Please add a name and a simple instruction.");
      return;
    }
    if (!editing.photoId && !/^(https?:\/\/|\/images\/)/.test(editing.photo)) {
      setError("Choose a built-in image or enter an http(s) photo URL.");
      return;
    }
    setBusy(true);
    try {
      let photoId = editing.photoId;
      if (upload) {
        validMedia(upload, "image");
        photoId = crypto.randomUUID();
        await putMedia(photoId, upload);
      }
      const landmark = {
        ...editing,
        photoId,
        name: editing.name.trim(),
        instruction: editing.instruction.trim(),
      };
      await memoryApproval(landmark);
      s.saveLandmark(landmark);
    } catch (error) {
      setError((error as Error).message);
      return;
    } finally {
      setBusy(false);
    }
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
              trigger.current = document.activeElement as HTMLElement;
              setEditing({
                id: crypto.randomUUID(),
                name: "",
                instruction: "",
                photo: samples[0],
                approved: false,
                memoryApproved: false,
                enabled: true,
              });
              setUpload(undefined);
              setError("");
            }}
          >
            <Plus size={18} />
            Add landmark
          </button>
        }
      />
      <LandmarkFamiliarity />
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
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={l.memoryApproved ?? false}
                  onChange={async (e) => {
                    const next = { ...l, memoryApproved: e.target.checked };
                    try {
                      await memoryApproval(next);
                      s.saveLandmark(next);
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                />
                Separately approve for Memory Garden
              </label>
              <div className="button-row">
                <button
                  className="button light"
                  onClick={() => {
                    trigger.current = document.activeElement as HTMLElement;
                    setEditing({ ...l });
                    setUpload(undefined);
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
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="landmark-title"
            className="modal card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setEditing(null);
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
                disabled={busy}
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
              Upload landmark photograph
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => setUpload(e.target.files?.[0])}
              />
            </label>
            <label>
              Recognition description
              <textarea
                value={editing.recognition ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, recognition: e.target.value })
                }
              />
            </label>
            <label>
              Spoken guidance cue
              <input
                value={editing.spokenCue ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, spokenCue: e.target.value })
                }
              />
            </label>
            <label>
              Grid position (0–6)
              <input
                type="number"
                min={0}
                max={6}
                value={editing.gridPosition ?? 0}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    gridPosition: Math.min(
                      6,
                      Math.max(0, Number(e.target.value)),
                    ),
                  })
                }
              />
            </label>
            <label>
              Visibility
              <select
                aria-label="Visibility"
                value={editing.visibility ?? "both"}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    visibility: e.target.value as Landmark["visibility"],
                  })
                }
              >
                <option value="both">Day and night</option>
                <option value="day">Daytime</option>
                <option value="night">Nighttime</option>
              </select>
            </label>
            <label>
              Visual salience
              <select
                value={editing.salience ?? "medium"}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    salience: e.target.value as Landmark["salience"],
                  })
                }
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </label>
            <label>
              Familiarity
              <select
                value={editing.familiarity ?? "familiar"}
                onChange={(e) =>
                  setEditing({ ...editing, familiarity: e.target.value })
                }
              >
                <option value="familiar">Familiar</option>
                <option value="very familiar">Very familiar</option>
                <option value="caregiver review">Needs caregiver review</option>
              </select>
            </label>
            <label>
              Caregiver notes
              <textarea
                value={editing.notes ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.enabled !== false}
                onChange={(e) =>
                  setEditing({ ...editing, enabled: e.target.checked })
                }
              />
              Landmark temporarily enabled
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editing.memoryApproved ?? false}
                onChange={(e) =>
                  setEditing({ ...editing, memoryApproved: e.target.checked })
                }
              />
              Approve separately for Memory Garden
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
            <button className="button" type="submit" disabled={busy}>
              Save landmark <Check size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
