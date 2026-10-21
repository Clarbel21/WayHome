import { useEffect, useState } from "react";
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("wayhome-memory-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("media");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = undefined;
      reject(new Error("Browser media storage is unavailable."));
    };
  }));
}
export async function putMedia(id: string, blob: Blob) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new Error("Could not save media. Browser storage may be full."));
    tx.onabort = () => reject(new Error("Media save was interrupted."));
  });
}
export async function getMedia(id: string): Promise<Blob | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("media", "readonly").objectStore("media").get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read saved media."));
  });
}
export async function removeMedia(id: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("Could not remove media."));
  });
}
export function validMedia(file: Blob, kind: "image" | "audio") {
  if (file.size === 0)
    throw Error("Choose a file that contains an image or recording.");
  const allowed =
    kind === "image"
      ? ["image/png", "image/jpeg", "image/webp", "image/gif"]
      : [
          "audio/mpeg",
          "audio/wav",
          "audio/x-wav",
          "audio/ogg",
          "audio/mp4",
          "audio/webm",
          "audio/flac",
          "audio/x-m4a",
        ];
  if (!allowed.includes(file.type))
    throw Error(
      `Choose a supported ${kind} file (${kind === "image" ? "PNG, JPEG, WebP or GIF" : "MP3, WAV, Ogg, M4A, WebM or FLAC"}).`,
    );
  if (file.size > (kind === "image" ? 5 : 20) * 1024 * 1024)
    throw Error(
      `${kind === "image" ? "Image" : "Audio"} is too large (maximum ${kind === "image" ? 5 : 20} MB).`,
    );
}
export function useMediaURL(id?: string) {
  const [result, setResult] = useState<{ url?: string; error?: string }>({});
  useEffect(() => {
    let live = true;
    let url: string | undefined;
    setResult({});
    if (id)
      getMedia(id)
        .then((blob) => {
          if (!live) return;
          if (!blob) {
            setResult({
              error:
                "This file is missing. Your caregiver can restore a backup or upload it again.",
            });
            return;
          }
          url = URL.createObjectURL(blob);
          setResult({ url });
        })
        .catch(() => {
          if (live)
            setResult({
              error: "Saved media could not be opened in this browser.",
            });
        });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return result;
}
export function blobData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(Error("Could not prepare media backup."));
    r.readAsDataURL(blob);
  });
}
