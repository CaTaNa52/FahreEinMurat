// Shared, deterministic game rules. No React, timers or backend required.
export const roadX = z => Math.sin(z * 0.004) * 48 + Math.sin(z * 0.012) * 10;

export const CHALLENGES = {
  slalom: { id: 'slalom', name: 'SLALOM-SPRINT', reward: 1000, limit: 40, x: roadX(-22), z: -22, radius: 4.5 },
  wheelie: { id: 'wheelie', name: 'WHEELIE-BALANCE', reward: 1000, limit: 35, goal: 4, x: roadX(-151), z: -151, radius: 5 },
};
export const SLALOM_CONES = Array.from({ length: 7 }, (_, i) => {
  const z = -38 - i * 11;
  return { x: roadX(z), z, side: i % 2 === 0 ? 1 : -1 };
});
export const SLALOM_FINISH = -122;
export const MAX_WHEELIE_PITCH = 0.87;
export const WHEELIE_BAND = [0.23, 0.7];

export function updateWheelie(p, holding, braking, dt) {
  // Acceleration from rear-wheel torque competes with gravity, inertia and air damping.
  // A tap builds angular momentum; release or brake lets gravity bring the front down.
  const speedFactor = Math.max(0, Math.min(1, (p.speed - 2) / 8));
  const torque = holding && !braking ? 3.45 * speedFactor : 0;
  const gravity = 0.57 + 1.8 * Math.sin(p.pitch);
  p.pitchVel += (torque - gravity - (braking ? 5 : 0)) * dt;
  p.pitchVel *= Math.exp(-1.65 * dt);
  p.pitch += p.pitchVel * dt;
  if (p.pitch <= 0) { p.pitch = 0; p.pitchVel = Math.max(0, p.pitchVel); }
  return p.pitch >= MAX_WHEELIE_PITCH;
}

export function createChallengeState() {
  return { active: null, remaining: 0, progress: 0, held: 0, lastZone: null, uiTimer: 0 };
}
function crossingX(before, after, z) {
  if (!(before.z > z && after.z <= z)) return null;
  const fraction = (before.z - z) / (before.z - after.z);
  return before.x + (after.x - before.x) * fraction;
}
function result(state, type, reason, emit) {
  const id = state.active;
  state.active = null;
  state.uiTimer = 0;
  emit({ type, id, reason, progress: state.progress, total: id === 'slalom' ? SLALOM_CONES.length : CHALLENGES.wheelie.goal });
}
export function failChallenge(state, reason, emit) {
  if (state.active) result(state, 'failed', reason, emit);
}
export function updateChallenges(state, before, player, dt, emit) {
  const zone = Object.values(CHALLENGES).find(z => Math.hypot(player.x - z.x, player.z - z.z) <= z.radius)?.id ?? null;
  if (!state.active && zone && zone !== state.lastZone && !player.fallen) {
    state.active = zone;
    state.remaining = CHALLENGES[zone].limit;
    state.progress = 0;
    state.held = 0;
    state.uiTimer = 0;
    emit({ type: 'start', id: zone, remaining: state.remaining, progress: 0 });
  }
  state.lastZone = zone;
  if (!state.active) return;
  state.remaining = Math.max(0, state.remaining - dt);
  if (state.remaining <= 0) { result(state, 'failed', 'Zeit abgelaufen!', emit); return; }

  if (state.active === 'slalom') {
    const next = SLALOM_CONES[state.progress];
    // At each cone the scooter must pass on the highlighted, alternating side.
    if (next) {
      const x = crossingX(before, player, next.z);
      if (x !== null) {
        const distance = (x - next.x) * next.side;
        if (distance < 1.12 || distance > 5.15) {
          result(state, 'failed', 'Falsche Seite! Folge den grünen Markierungen.', emit);
          return;
        }
        state.progress++;
        emit({ type: 'progress', id: 'slalom', progress: state.progress, remaining: state.remaining, total: SLALOM_CONES.length });
      }
    }
    for (const cone of SLALOM_CONES) {
      if (Math.hypot(player.x - cone.x, player.z - cone.z) < 0.75) {
        result(state, 'failed', 'Hütchen berührt! Versuch es erneut.', emit);
        return;
      }
    }
    if (crossingX(before, player, SLALOM_FINISH) !== null) {
      if (state.progress === SLALOM_CONES.length) result(state, 'won', '', emit);
      else result(state, 'failed', 'Nicht alle Hütchen umfahren!', emit);
      return;
    }
  } else {
    const balanced = player.speed > 3 && player.pitch >= WHEELIE_BAND[0] && player.pitch <= WHEELIE_BAND[1];
    state.held = balanced ? state.held + dt : 0;
    state.progress = Math.min(CHALLENGES.wheelie.goal, state.held);
    if (state.progress >= CHALLENGES.wheelie.goal) {
      result(state, 'won', '', emit);
      return;
    }
  }

  state.uiTimer += dt;
  if (state.uiTimer >= 0.12) {
    state.uiTimer = 0;
    emit({ type: 'progress', id: state.active, remaining: state.remaining,
      progress: state.progress, total: state.active === 'slalom' ? SLALOM_CONES.length : CHALLENGES.wheelie.goal,
      pitch: player.pitch });
  }
}
