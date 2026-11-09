/** Vector rendering of the house, sprout and location-pin mark supplied by the user. */
export function WayHomeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`wayhome-mark ${className}`}
      viewBox="0 0 100 112"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M50 2C23 2 5 20 5 45c0 25 23 52 40 65a8 8 0 0 0 10 0c17-13 40-40 40-65C95 20 77 2 50 2Z"
        fill="currentColor"
      />
      <path
        d="m25 36 20-16a8 8 0 0 1 10 0l20 16a9 9 0 0 1 4 7v23c0 5-3 8-8 8H29c-5 0-8-3-8-8V43a9 9 0 0 1 4-7Z"
        fill="#fffdf7"
      />
      <path
        d="M49 61C32 66 23 46 34 45c12-1 17 8 15 16Zm2 0c-2-10 5-17 15-16 12 1 1 21-15 16Z"
        fill="currentColor"
      />
      <path
        d="M50 57c2 7 2 13-1 20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
