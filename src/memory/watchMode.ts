import { createContext, useContext } from "react";

/**
 * True when the Memory Garden is running on the small watch screen. Screens use
 * it to show fewer, bigger words for older eyes.
 */
export const OnWatch = createContext(false);
export const useOnWatch = () => useContext(OnWatch);
