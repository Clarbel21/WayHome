export function Photo({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={
        src.startsWith("/images/")
          ? `${import.meta.env.BASE_URL}${src.slice(1)}`
          : src
      }
      alt={alt}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = `${import.meta.env.BASE_URL}images/home.svg`;
      }}
    />
  );
}
