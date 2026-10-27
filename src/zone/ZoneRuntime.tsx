import { useEffect, useRef } from "react";
import { navigable, resetListeners, useStore } from "../store";
import {
  PROMPT_SECONDS,
  REASK_AFTER_SILENCE_S,
  SIM_MIN_PER_SECOND,
  ladderLevel,
  legTarget,
  useZone,
} from "./store";

const TICK_MS = 250;
const WANDER_STEP_M = 18; // per tick while walking away
const GUIDE_STEP_M = 14; // per tick while walking toward a landmark

function addAlert(title: string, urgent = false) {
  useStore.setState((s) => ({
    alerts: [
      { id: crypto.randomUUID(), title, time: Date.now(), read: false, urgent },
      ...s.alerts,
    ].slice(0, 100),
  }));
}

let audio: AudioContext | null = null;
function chime(strong: boolean) {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    (strong ? [660, 880] : [740]).forEach((hz, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.18);
    });
  } catch {
    /* audio unavailable: the visual buzz still shows */
  }
}

export function ZoneRuntime() {
  const prevMode = useRef(useStore.getState().mode);
  const lastBuzz = useRef(0);
  useEffect(() => {
    const clear = () => useZone.getState().reset();
    resetListeners.add(clear);
    return () => {
      resetListeners.delete(clear);
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const z = useZone.getState();
      const s = useStore.getState();
      const now = Date.now();
      const sos = s.mode === "EMERGENCY_SIMULATED";
      const guiding = s.mode === "GUIDED_RETURN";
      const name = s.settings.wearer.split(" ")[0];
      const patch: Partial<typeof z> = {};
      let distance = z.distanceM;

      // Walking away from home (presenter moment).
      if (z.wanderTo !== null && !sos) {
        distance = Math.min(z.wanderTo, distance + WANDER_STEP_M);
        patch.distanceM = distance;
        if (distance >= z.wanderTo) patch.wanderTo = null;
      }

      // Crossing the radius starts the check-in and the ladder.
      if (!z.active && distance > z.radiusM && !sos && !guiding) {
        Object.assign(patch, {
          active: true,
          vmin: 0,
          level: 1,
          prompt: true,
          promptAt: now,
          reaskAt: null,
          noAnswer: 0,
          buzzAt: now,
        });
        addAlert(
          `${name} left the safe zone — ${(distance / 1000).toFixed(2)} km from home (radius ${z.radiusM} m) · watch check-in started`,
        );
      }

      // Guided return: walk toward the current landmark, then ask "Do you see it?".
      // Guidance started from inside the zone (e.g. the watch's Go home tile): use a
      // fictional starting point inside the radius so the walk home is still shown.
      const guideStart =
        z.guideStartM ??
        (guiding
          ? distance > 0
            ? distance
            : Math.round(z.radiusM * 0.85)
          : null);
      if (guiding && guideStart !== null) {
        if (z.guideStartM === null) {
          distance = guideStart;
          patch.distanceM = guideStart;
          patch.phase = "walking";
          patch.guideStartM = guideStart;
          patch.prompt = false;
          patch.reaskAt = null;
          patch.wanderTo = null;
        }
        const legs = s.landmarks.filter(navigable).length;
        const target = legTarget(guideStart, s.guideIndex, legs);
        if (distance > target) {
          distance = Math.max(target, distance - GUIDE_STEP_M);
          patch.distanceM = distance;
          patch.phase = "walking";
        } else if (z.phase === "walking") {
          patch.phase = "look";
          patch.buzzAt = now;
        }
      }

      // Guidance ended: arrived home, or stopped (I don't see it / cancel / SOS).
      if (!guiding && z.guideStartM !== null) {
        const arrived =
          prevMode.current === "GUIDED_RETURN" &&
          s.mode === "NORMAL" &&
          s.position === 6;
        if (arrived) {
          Object.assign(patch, {
            distanceM: 0,
            active: false,
            level: 0,
            vmin: 0,
            prompt: false,
            reaskAt: null,
            guideStartM: null,
            phase: "look",
          });
          distance = 0;
          if (z.active)
            addAlert(`${name} arrived home safely · safe-zone check closed`);
        } else {
          patch.guideStartM = null;
          patch.phase = "look";
        }
      }

      const active = patch.active ?? z.active;
      const stillGuiding =
        guiding && (patch.guideStartM ?? z.guideStartM) !== null;

      // Walked back inside without guidance.
      if (active && distance <= z.radiusM && !stillGuiding && !patch.active) {
        Object.assign(patch, {
          active: false,
          level: 0,
          vmin: 0,
          prompt: false,
          reaskAt: null,
        });
        addAlert(`${name} is back inside the safe zone`);
      }

      // Escalation ladder runs in simulated minutes; paused while guiding or in SOS.
      if ((patch.active ?? z.active) && !sos && !guiding && z.active) {
        let vmin = z.vmin + (TICK_MS / 1000) * SIM_MIN_PER_SECOND;
        // Silence on the watch: record it and re-ask shortly.
        if (z.prompt && now - z.promptAt > PROMPT_SECONDS * 1000) {
          patch.prompt = false;
          patch.noAnswer = z.noAnswer + 1;
          patch.reaskAt = now + REASK_AFTER_SILENCE_S * 1000;
          vmin = Math.max(vmin, z.notifyPrimaryMin);
          addAlert(
            `No answer on the watch (${z.noAnswer + 1}) · will ask again`,
          );
        } else if (!z.prompt && z.reaskAt !== null && now >= z.reaskAt) {
          Object.assign(patch, {
            prompt: true,
            promptAt: now,
            reaskAt: null,
            buzzAt: now,
          });
        }
        patch.vmin = vmin;
        const level = ladderLevel(vmin, z);
        if (level > z.level) {
          patch.level = level;
          if (level >= 2 && z.level < 2)
            addAlert(
              `Push notification to ${s.settings.caregiver} — ${name} outside the safe zone for ${z.notifyPrimaryMin} min (simulated)`,
            );
          if (level >= 3 && z.level < 3) {
            addAlert(
              `SMS and call to ${s.settings.emergency} — ${name} still outside the safe zone (simulated, no real call)`,
              true,
            );
            patch.buzzAt = now;
          }
          if (level >= 4 && z.level < 4) {
            patch.prompt = false;
            s.event(
              "SOS",
              `Safe-zone escalation: outside for ${z.emergencyMin} min — simulated emergency step, no real dispatch`,
            );
          }
        }
      }

      if (Object.keys(patch).length) useZone.setState(patch);

      const buzzAt = patch.buzzAt ?? z.buzzAt;
      if (buzzAt && buzzAt !== lastBuzz.current) {
        lastBuzz.current = buzzAt;
        navigator.vibrate?.([400, 150, 400]);
        chime((patch.level ?? z.level) >= 3 || !!patch.prompt);
      }
      prevMode.current = s.mode;
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return null;
}
