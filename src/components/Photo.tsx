import { useMediaURL } from "../memory/media";

/**
 * Watch photo. G4 caregivers can replace a built-in drawing with an uploaded
 * image (IndexedDB id). While it loads, or if it is missing, the built-in
 * drawing remains visible.
 */
export function Photo({
  src,
  alt,
  mediaId,
}: {
  src: string;
  alt: string;
  mediaId?: string;
}) {
  const { url } = useMediaURL(mediaId);
  const fallback = src.startsWith("/images/")
    ? `${import.meta.env.BASE_URL}${src.slice(1)}`
    : src;
  return (
    <img
      src={url ?? fallback}
      alt={alt}
      onError={(e) => {
        if (e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
          return;
        }
        e.currentTarget.onerror = null;
        e.currentTarget.src = `${import.meta.env.BASE_URL}images/home.svg`;
      }}
    />
  );
}
