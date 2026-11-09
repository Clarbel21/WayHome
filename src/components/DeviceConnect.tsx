import { useEffect, useRef, useState } from "react";
import { BleDevice } from "../services/ble";

/**
 * Pair the real ESP32-S3 "Sprout" watch over Web Bluetooth. The simulated
 * adapter remains the default; this panel opts a session into hardware.
 * requestDevice() must run inside a click handler, hence the button.
 */

type Status = "idle" | "connecting" | "connected" | "error";

// One adapter per page: keeps GATT state across mounts.
const bleDevice = new BleDevice();

export function DeviceConnect() {
  const [status, setStatus] = useState<Status>(
    bleDevice.connected ? "connected" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(
    () =>
      bleDevice.subscribe((e) => {
        if (e.type === "connection")
          setStatus(e.connected ? "connected" : "idle");
      }),
    [],
  );

  async function connect() {
    if (busy.current) return;
    busy.current = true;
    setStatus("connecting");
    setMessage(null);
    try {
      await bleDevice.connect();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Pairing failed — try again.",
      );
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="button-row device-connect">
      {status === "connected" ? (
        <>
          <p role="status" className="device-status ok">
            Sprout watch connected · live telemetry
          </p>
          <button className="button light" onClick={() => bleDevice.disconnect()}>
            Disconnect watch
          </button>
        </>
      ) : (
        <>
          <button
            className="button light"
            disabled={status === "connecting"}
            onClick={() => void connect()}
          >
            {status === "connecting" ? "Pairing…" : "Connect Sprout watch"}
          </button>
          <p role="status" className="device-status">
            {message ??
              "Simulated device · pair the ESP32-S3 watch for live battery, wear and SOS"}
          </p>
        </>
      )}
    </div>
  );
}
