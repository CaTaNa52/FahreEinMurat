// Walk-in police station: door trigger outside, room layout, on-foot movement
// and interaction spots inside. Coordinates inside are local to the room centre.
import { POLICE, resolveWorldMovement } from './worldLayout.js';

// Outside: in front of the glass entrance on the west facade.
export const STATION_DOOR = { x: POLICE.x - POLICE.w / 2 - 2.6, z: POLICE.z, radius: 4.4 };
export const nearStationDoor = (x, z) => Math.hypot(x - STATION_DOOR.x, z - STATION_DOOR.z) < STATION_DOOR.radius;

// The room is rendered far below the map so the open world keeps running above it.
export const ROOM = { w: 16, d: 12, h: 3.5, x: POLICE.x, y: -60, z: POLICE.z };
export const WALK = { forward: 3.4, back: 1.6, turn: 2.6, radius: .38 };
export const ENTRY = { x: 0, z: ROOM.d / 2 - 2.2, yaw: 0 };
export const SPOTS = {
  exit: { x: 0, z: ROOM.d / 2 - .9, radius: 2 },
  officer: { x: -3.2, z: .3, radius: 2.3 },
  inmate: { x: 6.2, z: -1.7, radius: 1.7 },
};
export const COUNTER = { x: -3.2, z: -1, w: 5.2, d: 1.1 };
export const CELLS = { x0: 1, x1: ROOM.w / 2, z0: -ROOM.d / 2, z1: -2.6, split: 4.5, door: [2.1, 3.5] };
// Solid furniture and cell walls (local coordinates).
export const INTERIOR_OBSTACLES = [
  { id: 'counter', ...COUNTER },
  { id: 'desk', x: -5.6, z: -4.5, w: 2.6, d: 1.2 },
  { id: 'lockers', x: -7.55, z: 2.6, w: .7, d: 3.4 },
  { id: 'bench', x: 7.4, z: 2.6, w: .9, d: 3.2 },
  { id: 'plant', x: 7.3, z: 5.2, w: .7, d: .7 },
  { id: 'cell-west', x: CELLS.x0, z: (CELLS.z0 + CELLS.z1) / 2, w: .2, d: CELLS.z1 - CELLS.z0 },
  { id: 'cell-split', x: CELLS.split, z: (CELLS.z0 + CELLS.z1) / 2, w: .2, d: CELLS.z1 - CELLS.z0 },
  { id: 'bars-a', x: (CELLS.x0 + CELLS.door[0]) / 2, z: CELLS.z1, w: CELLS.door[0] - CELLS.x0, d: .2 },
  { id: 'bars-b', x: (CELLS.door[1] + CELLS.x1) / 2, z: CELLS.z1, w: CELLS.x1 - CELLS.door[1], d: .2 },
  { id: 'cot', x: 2.75, z: -5.45, w: 2.2, d: .9 },
];

export function createWalk() { return { ...ENTRY, speed: 0, stride: 0 }; }
// Gas walks forward, brake/back walks backwards, left/right turn on the spot.
export function updateWalk(state, controls, dt) {
  const step = Math.max(0, Math.min(.05, dt));
  const target = controls.brake || (controls.back && !controls.forward) ? -WALK.back : controls.forward ? WALK.forward : 0;
  state.speed += (target - state.speed) * (1 - Math.exp(-9 * step));
  if (!target && Math.abs(state.speed) < .05) state.speed = 0;
  state.yaw += (Number(!!controls.left) - Number(!!controls.right)) * WALK.turn * step;
  const to = { x: state.x - Math.sin(state.yaw) * state.speed * step, z: state.z - Math.cos(state.yaw) * state.speed * step };
  const moved = resolveWorldMovement(state, to, INTERIOR_OBSTACLES, WALK.radius);
  const limitX = ROOM.w / 2 - WALK.radius - .1, limitZ = ROOM.d / 2 - WALK.radius - .1;
  state.x = Math.max(-limitX, Math.min(limitX, moved.x));
  state.z = Math.max(-limitZ, Math.min(limitZ, moved.z));
  state.stride += Math.abs(state.speed) * step * 1.9;
  return state;
}
// Which interaction is in reach: 'exit' | 'officer' | 'inmate' | null.
export function interiorAction(x, z) {
  for (const [id, spot] of Object.entries(SPOTS)) {
    if (Math.hypot(x - spot.x, z - spot.z) < spot.radius) return id;
  }
  return null;
}
// What the people inside say; the officer knows the rider's record.
export function stationLine(who, record, turn = 0) {
  if (who === 'inmate') {
    return ['Ich war’s nicht! Der Scooter stand schon so da.', 'Sag dem Beamten, ich will meinen Anruf.', 'Fahr du mal lieber vorsichtig, sonst sitzt du neben mir.'][turn % 3];
  }
  const { crashes = 0, damage = 0 } = record || {};
  const lines = ['Guten Tag! Willkommen in der Polizeiwache. Wie kann ich helfen?'];
  if (crashes >= 3) lines.push(`Uns wurden heute schon ${crashes} Unfälle mit einem E-Scooter gemeldet. Ich schaue mal nicht so genau hin.`);
  else if (crashes > 0) lines.push(`${crashes === 1 ? 'Ein Unfall' : crashes + ' Unfälle'} heute? Bitte Abstand zu den Autos halten.`);
  else lines.push('Keine Unfälle bisher. Vorbildlich, weiter so!');
  if (damage >= 40) lines.push('Ihr Scooter sieht mitgenommen aus. Die Garage ist die Straße runter Richtung Süden.');
  lines.push('Die Zellen hinten sind offen zur Besichtigung. Der Herr in Zelle 2 bleibt aber hier.');
  return lines[turn % lines.length];
}
