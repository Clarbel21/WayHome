import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Download, Upload, Leaf } from "lucide-react";
import {
  activityNames,
  kinds,
  useMemory,
  type MemoryEntry,
  type ActivityKind,
} from "./store";
import { useStore } from "../store";
import { putMedia, removeMedia, useMediaURL, validMedia } from "./media";
import { createBackup, restoreBackup } from "./backup";
import { MemoryImage } from "./MemoryPlayer";
import { GardenVisualization } from "./GardenVisualization";
export function MemoryActivityHistory({
  compact = false,
}: {
  compact?: boolean;
}) {
  const history = useMemory((s) => s.history);
  return (
    <section className="memory-history">
      <h2>Shared moments</h2>
      <p>Activities and preferences, never a cognitive score.</p>
      {!history.length ? (
        <p className="memory-notice">
          No shared moments yet. Explore an activity together when you're ready.
        </p>
      ) : (
        <ul>
          {(compact ? history.slice(0, 4) : history.slice(0, 30)).map((h) => (
            <li key={h.id}>
              <strong>{activityNames[h.kind]}</strong>
              <span>
                {h.action}
                {h.detail ? ` · ${h.detail}` : ""}
              </span>
              <time dateTime={new Date(h.time).toISOString()}>
                {new Date(h.time).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
      {!compact && history.length > 30 && (
        <p>Showing the latest 30 of {history.length} locally saved events.</p>
      )}
    </section>
  );
}
function Preview({ entry }: { entry: MemoryEntry }) {
  const [reveal, setReveal] = useState(false);
  const audio = useMediaURL(entry.audioId);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = audioRef.current;
    return () => element?.pause();
  }, [audio.url]);
  return (
    <div className="memory-preview">
      <h2>{activityNames[entry.kind]} · Caregiver preview</h2>
      <p>
        {entry.approved
          ? "Approved content"
          : "Not approved — hidden from Companion Mode"}
        . Preview does not grow the garden or record engagement.
      </p>
      {["faces", "places"].includes(entry.kind) && (
        <MemoryImage entry={entry} hidden={!reveal} />
      )}
      <h3>
        {entry.kind === "faces"
          ? "Does this person look familiar?"
          : entry.kind === "places"
            ? "Does this place bring back any memories?"
            : entry.kind === "music"
              ? "How does this song make you feel?"
              : entry.title}
      </h3>
      {entry.kind === "routine" ? (
        <ol>
          {entry.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : !reveal ? (
        <button className="button" onClick={() => setReveal(true)}>
          {entry.kind === "faces" ? "Tell me more" : "Reveal memory"}
        </button>
      ) : (
        <div className="memory-reveal">
          <h3>{entry.title}</h3>
          <p>
            {entry.relationship} {entry.artist}
          </p>
          <p>{entry.description}</p>
        </div>
      )}
      {entry.kind === "music" &&
        (audio.url ? (
          <>
            <p>Uploaded recording. Play only when you choose.</p>
            <audio ref={audioRef} controls src={audio.url} />
          </>
        ) : (
          <p>No audio is attached or available; nothing is playing.</p>
        ))}
    </div>
  );
}
export function CaregiverMemoryLibrary() {
  const m = useMemory();
  const name = useStore((s) => s.settings.companionName);
  const [editing, setEditing] = useState<MemoryEntry | null>(null);
  const [preview, setPreview] = useState<MemoryEntry | null>(null);
  const [image, setImage] = useState<File>();
  const [audio, setAudio] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const editor = useRef<HTMLDialogElement>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openEditor = (entry: MemoryEntry) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setEditing({ ...entry, steps: [...entry.steps] });
    setImage(undefined);
    setAudio(undefined);
    setError("");
    editor.current?.showModal();
  };
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    const draft = {
      ...editing,
      title: editing.title.trim(),
      description: editing.description.trim(),
      steps:
        editing.kind === "routine"
          ? editing.steps.map((step) => step.trim())
          : [],
    };
    if (
      !draft.title ||
      (draft.kind === "routine" &&
        (draft.steps.length !== 3 || draft.steps.some((step) => !step)))
    ) {
      setError(
        "Please add a title and three clear routine steps when applicable.",
      );
      return;
    }
    setBusy(true);
    const created: string[] = [];
    try {
      if (image) {
        validMedia(image, "image");
        draft.imageId = crypto.randomUUID();
        await putMedia(draft.imageId, image);
        created.push(draft.imageId);
        draft.image = undefined;
        draft.sample = false;
      }
      if (audio) {
        validMedia(audio, "audio");
        draft.audioId = crypto.randomUUID();
        await putMedia(draft.audioId, audio);
        created.push(draft.audioId);
        draft.sample = false;
      }
      const old = m.entries.find((x) => x.id === draft.id);
      m.saveEntry(draft);
      editor.current?.close();
      setNotice(
        "Memory saved. Only approved entries appear in Companion Mode.",
      );
      for (const id of [old?.imageId, old?.audioId])
        if (id && id !== draft.imageId && id !== draft.audioId)
          await removeMedia(id).catch(() => {});
    } catch (err) {
      await Promise.allSettled(created.map((id) => removeMedia(id)));
      setError(
        err instanceof Error ? err.message : "The memory could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function backup(media: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await createBackup(m.entries, media);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = media
        ? "wayhome-memory-with-media.json"
        : "wayhome-memory-metadata.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        media
          ? "Complete library backup downloaded. Keep it somewhere private."
          : "Metadata downloaded. Uploaded media is not included; use Back up with media for a complete library backup.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backup failed.");
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 100 * 1024 * 1024)
        throw Error("Choose a backup smaller than 100 MB.");
      const entries = await restoreBackup(JSON.parse(await file.text()));
      entries.forEach(m.saveEntry);
      setNotice(
        `Imported ${entries.length} entries as new copies. Review approvals before sharing. A metadata-only backup cannot restore uploaded media.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The backup could not be imported.",
      );
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LITTLE MOMENTS, MEANINGFUL CONNECTIONS</div>
          <h1>Memory Library</h1>
          <p>Personal memories to explore together with {name}.</p>
        </div>
        <button
          className="button"
          onClick={() =>
            openEditor({
              id: crypto.randomUUID(),
              kind: "faces",
              title: "",
              relationship: "",
              description: "",
              artist: "",
              steps: ["", "", ""],
              approved: false,
              sample: false,
            })
          }
        >
          <Plus size={17} />
          Add memory
        </button>
      </div>
      <section className="card settings-card memory-library-intro">
        <div>
          <h2>A little care goes a long way.</h2>
          <p>
            Photos and audio stay in this browser’s IndexedDB. Metadata and
            preferences stay in localStorage. Nothing is uploaded to WayHome,
            and edits do not sync to other devices. Same-origin tabs share local
            content. Back up before clearing browser data.
          </p>
          <p>
            Use photos you have permission to share and audio you own or are
            authorized to use. Built-in people and places are fictional
            illustrations, not personal photographs. Reminiscence is for
            connection, not diagnosis or a proven dementia treatment.
          </p>
        </div>
        <Link className="button light" to="/memories">
          Preview Companion Mode →
        </Link>
      </section>
      <div className="button-row memory-backups">
        <button
          disabled={busy}
          className="button light"
          onClick={() => backup(false)}
        >
          <Download size={16} />
          Export metadata JSON
        </button>
        <button
          disabled={busy}
          className="button light"
          onClick={() => backup(true)}
        >
          <Download size={16} />
          Back up with media
        </button>
        <button
          disabled={busy}
          className="button light"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={16} />
          Import backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Import memory backup"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </div>
      <p className="help-text">
        Imports add new copies without overwriting existing entries. Library
        backups include entries and optionally media, not garden progress,
        history, or preferences.
      </p>
      <p role="status" className="memory-notice">
        {busy ? "Working with your local library…" : notice}
      </p>
      {error && !editor.current?.open && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="memory-library-grid">
        {m.entries.map((entry) => (
          <section className="card memory-library-entry" key={entry.id}>
            <div className="memory-entry-art">
              {["faces", "places"].includes(entry.kind) ? (
                <MemoryImage entry={entry} />
              ) : (
                <span>{entry.kind === "music" ? "♫" : "☀"}</span>
              )}
            </div>
            <div className="landmark-content">
              <div className="eyebrow">
                {activityNames[entry.kind]}
                {entry.sample ? " · SAMPLE" : ""}
              </div>
              <h2>{entry.title}</h2>
              <p>{entry.relationship || entry.artist || entry.description}</p>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={entry.approved}
                  onChange={(e) =>
                    m.saveEntry({ ...entry, approved: e.target.checked })
                  }
                />
                Approved for memories
              </label>
              <div className="button-row">
                <button
                  className="button light"
                  onClick={() => openEditor(entry)}
                >
                  Edit
                </button>
                <button
                  className="button light"
                  onClick={() => {
                    returnFocus.current = document.activeElement as HTMLElement;
                    setPreview(entry);
                    previewDialog.current?.showModal();
                  }}
                >
                  Preview
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete memory ${entry.title}`}
                  onClick={async () => {
                    m.deleteEntry(entry.id);
                    for (const id of [entry.imageId, entry.audioId])
                      if (id)
                        await removeMedia(id).catch(() =>
                          setNotice(
                            "Entry deleted. An unused file may remain in browser storage.",
                          ),
                        );
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
      {!m.entries.length && (
        <section className="card empty">
          <Leaf />
          <h2>Your library is ready for a first memory.</h2>
          <p>
            Add a person, place, song, or routine. Your garden progress is safe.
          </p>
        </section>
      )}
      <section className="card settings-card memory-preferences">
        <h2>Gentle preferences</h2>
        <p>
          Duration and reminder choices are saved preferences only. There are no
          timers, deadlines, automatic popups, or difficulty changes.
        </p>
        <fieldset>
          <legend>Preferred activity types</legend>
          {kinds.map((kind) => (
            <label className="check-label" key={kind}>
              <input
                type="checkbox"
                checked={m.preferences.preferred.includes(kind)}
                onChange={(e) =>
                  m.setPreferences({
                    preferred: e.target.checked
                      ? [...m.preferences.preferred, kind]
                      : m.preferences.preferred.filter((k) => k !== kind),
                  })
                }
              />
              {activityNames[kind]}
            </label>
          ))}
        </fieldset>
        <p className="help-text">
          If none are selected, all activities remain available.
        </p>
        <div className="settings-grid">
          <label>
            Preferred interaction duration
            <select
              value={m.preferences.duration}
              onChange={(e) =>
                m.setPreferences({
                  duration: e.target.value as "short" | "unhurried",
                })
              }
            >
              <option value="short">A brief moment</option>
              <option value="unhurried">Unhurried, at their pace</option>
            </select>
          </label>
          <label>
            Reminder frequency (preference only)
            <select
              value={m.preferences.reminders}
              onChange={(e) =>
                m.setPreferences({
                  reminders: e.target.value as "off" | "daily" | "weekly",
                })
              }
            >
              <option value="off">No reminders</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
        </div>
        <label>
          Music preferences
          <input
            maxLength={200}
            value={m.preferences.music}
            onChange={(e) => m.setPreferences({ music: e.target.value })}
            placeholder="Favorite genres, artists, or quiet moments"
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={m.preferences.sound}
            onChange={(e) => m.setPreferences({ sound: e.target.checked })}
          />
          Enable optional music sound (still requires Play)
        </label>
      </section>
      <div className="memory-library-bottom">
        <section className="card settings-card">
          <h2>A garden of shared moments</h2>
          <GardenVisualization />
          <p>No scores, streaks, penalties, or cognitive predictions.</p>
        </section>
        <section className="card settings-card">
          <MemoryActivityHistory />
        </section>
      </div>
      <dialog
        ref={editor}
        className="memory-editor"
        aria-labelledby="memory-editor-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        onClose={() => {
          setEditing(null);
          returnFocus.current?.focus();
        }}
      >
        {editing && (
          <form onSubmit={save}>
            <h2 id="memory-editor-title">
              {m.entries.some((e) => e.id === editing.id) ? "Edit" : "Add"} a
              memory
            </h2>
            <fieldset disabled={busy}>
              <label>
                Activity type
                <select
                  value={editing.kind}
                  onChange={(e) => {
                    setImage(undefined);
                    setAudio(undefined);
                    setEditing({
                      ...editing,
                      kind: e.target.value as MemoryEntry["kind"],
                      imageId: undefined,
                      audioId: undefined,
                      image: undefined,
                      sample: false,
                    });
                  }}
                >
                  {kinds
                    .filter((k) => k !== "garden")
                    .map((kind) => (
                      <option key={kind} value={kind}>
                        {activityNames[kind]}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {editing.kind === "faces"
                  ? "Person’s name"
                  : editing.kind === "music"
                    ? "Song title"
                    : editing.kind === "routine"
                      ? "Routine invitation"
                      : "Place name"}
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </label>
              {editing.kind === "faces" && (
                <label>
                  Relationship
                  <input
                    maxLength={80}
                    value={editing.relationship}
                    onChange={(e) =>
                      setEditing({ ...editing, relationship: e.target.value })
                    }
                  />
                </label>
              )}
              {editing.kind === "music" && (
                <label>
                  Artist
                  <input
                    maxLength={120}
                    value={editing.artist}
                    onChange={(e) =>
                      setEditing({ ...editing, artist: e.target.value })
                    }
                  />
                </label>
              )}
              <label>
                Personal memory description
                <textarea
                  maxLength={500}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
              {editing.kind === "routine" &&
                [0, 1, 2].map((i) => (
                  <label key={i}>
                    Routine step {i + 1}
                    <input
                      required
                      maxLength={80}
                      value={editing.steps[i] || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          steps: [0, 1, 2].map((index) =>
                            index === i
                              ? e.target.value
                              : editing.steps[index] || "",
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              {["faces", "places"].includes(editing.kind) && (
                <>
                  <label>
                    Photograph (PNG, JPEG, WebP or GIF; up to 5 MB)
                    <input
                      key={`image-${editing.kind}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => setImage(e.target.files?.[0])}
                    />
                  </label>
                  {(editing.image || editing.imageId) && (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={!editing.image && !editing.imageId}
                        onChange={() =>
                          setEditing({
                            ...editing,
                            image: undefined,
                            imageId: undefined,
                            sample: false,
                          })
                        }
                      />
                      Remove current photo
                    </label>
                  )}
                </>
              )}
              {editing.kind === "music" && (
                <>
                  <label>
                    Optional authorized audio (up to 20 MB)
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/webm,audio/flac,audio/x-m4a"
                      onChange={(e) => setAudio(e.target.files?.[0])}
                    />
                  </label>
                  {editing.audioId && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setEditing({ ...editing, audioId: undefined })
                      }
                    >
                      Remove current audio
                    </button>
                  )}
                  <p>
                    No recording is necessary. Without audio, the wearer sees a
                    quiet sample activity.
                  </p>
                </>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={editing.approved}
                  onChange={(e) =>
                    setEditing({ ...editing, approved: e.target.checked })
                  }
                />
                Approved for Companion Mode
              </label>
            </fieldset>
            <p role="alert" className="form-error">
              {error}
            </p>
            <div className="button-row">
              <button className="button" disabled={busy} type="submit">
                {busy ? "Saving…" : "Save memory"}
              </button>
              <button
                className="button light"
                disabled={busy}
                type="button"
                onClick={() => editor.current?.close()}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
      <dialog
        ref={previewDialog}
        className="memory-editor"
        aria-label="Caregiver activity preview"
        onClose={() => {
          setPreview(null);
          returnFocus.current?.focus();
        }}
      >
        {preview && <Preview key={preview.id} entry={preview} />}
        <button
          autoFocus
          className="button light"
          onClick={() => previewDialog.current?.close()}
        >
          Close preview
        </button>
      </dialog>
    </>
  );
}
