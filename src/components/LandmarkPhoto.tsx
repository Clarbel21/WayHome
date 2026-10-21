import { type Landmark } from "../store";
import { Photo } from "./Photo";
import { useMediaURL } from "../memory/media";
export function LandmarkPhoto({ landmark }: { landmark: Landmark }) {
  const media = useMediaURL(landmark.photoId);
  if (landmark.photoId && !media.url)
    return (
      <p className="memory-notice">
        {media.error || "Opening the locally saved navigation photograph…"}
      </p>
    );
  return <Photo src={media.url || landmark.photo} alt={landmark.name} />;
}
