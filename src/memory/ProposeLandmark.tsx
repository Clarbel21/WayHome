import { useRef, useState } from "react";
import { useStore } from "../store";
import { useMemory, type MemoryEntry } from "./store";
import { getMedia, putMedia, removeMedia } from "./media";
export function ProposeLandmark({ entry }: { entry: MemoryEntry }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function propose(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!entry.approved || entry.kind !== "places" || !instruction.trim()) {
      setError(
        "Review memory approval and provide a simple instruction first.",
      );
      return;
    }
    setBusy(true);
    setError("");
    let photoId: string | undefined;
    try {
      if (entry.imageId) {
        const blob = await getMedia(entry.imageId);
        if (!blob)
          throw Error(
            "Restore or upload this memory photograph before proposing it for navigation.",
          );
        photoId = crypto.randomUUID();
        await putMedia(photoId, blob);
      }
      if (!photoId && !entry.image)
        throw Error("Add a photograph or sample image first.");
      const current = useMemory
        .getState()
        .entries.find((e) => e.id === entry.id);
      if (
        !current?.approved ||
        current.imageId !== entry.imageId ||
        current.image !== entry.image
      )
        throw Error(
          "The memory or its approval changed. Review it and propose again.",
        );
      useStore.getState().saveLandmark({
        id: crypto.randomUUID(),
        name: entry.title,
        instruction: instruction.trim(),
        photo: entry.image || "",
        photoId,
        sourceMemoryId: entry.id,
        approved: false,
      });
      setNotice(
        "Proposed as a pending landmark. Separate navigation approval is required in Familiar landmarks.",
      );
      dialog.current?.close();
    } catch (err) {
      if (photoId) await removeMedia(photoId).catch(() => {});
      setError(
        err instanceof Error ? err.message : "Could not propose this place.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="button light"
        disabled={!entry.approved || (!entry.image && !entry.imageId)}
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
      >
        Propose for landmark guidance
      </button>
      <p className="help-text" role="status">
        {notice}
      </p>
      <dialog
        ref={dialog}
        className="memory-editor"
        aria-label="Propose a memory place for navigation"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <form onSubmit={propose}>
          <h2>Separate navigation review</h2>
          <p>
            {entry.title} is approved for reminiscence only. This creates an
            independent, unapproved landmark copy. No memory description becomes
            a navigation instruction automatically.
          </p>
          <label>
            Proposed simple navigation instruction
            <textarea
              required
              maxLength={240}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </label>
          <p>
            A caregiver must review the place, photo and instruction, then
            explicitly approve navigation in Familiar landmarks.
          </p>
          <p role="alert" className="form-error">
            {error}
          </p>
          <div className="button-row">
            <button className="button" disabled={busy}>
              Create pending landmark
            </button>
            <button
              type="button"
              disabled={busy}
              className="button light"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
