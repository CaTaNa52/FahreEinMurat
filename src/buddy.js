// The buddy ("Kollege"): now and then he texts, waits at a spot along the road,
// hops on the back of the scooter, wants a lift somewhere and pays for the ride.
// Pure state machine: away -> waiting -> riding -> away.
import { roadX } from './gameplay.js';

export const BUDDY_NAME = 'Murat';
export const BUDDY_LOOK = { helmet: true, helmetColor: '#ff4fb0', jacket: '#f2c230', pants: '#2a2f45', watch: true, watchColor: '#35c8e8' };
// Named kerb-side spots, clear of lamps, signals and buildings.
export const BUDDY_SPOTS = [
  { name: 'BÄCKEREI', z: -408, side: 1 },
  { name: 'KIOSK', z: -280, side: 1 },
  { name: 'CAFÉ', z: -216, side: 1 },
  { name: 'POLIZEIWACHE', z: -104, side: 1 },
  { name: 'MARKT', z: -8, side: -1 },
  { name: 'GARAGE', z: 63, side: 1 },
  { name: 'ZUHAUSE', z: 146, side: -1 },
  { name: 'SPÄTI', z: 236, side: 1 },
  { name: 'WOHNPARK SÜD', z: 338, side: -1 },
].map(s => ({ ...s, x: roadX(s.z) + s.side * 7.1 }));

export const PICKUP_RADIUS = 4.8, DROP_RADIUS = 7, SLOW = 2.6;
const LINES = {
  call: spot => `Yo! Holst du mich ab? Ich steh am ${spot}.`,
  pickup: dest => `Läuft! Bring mich bitte zum ${dest}.`,
  dropoff: reward => `Danke fürs Mitnehmen, Bro! Hier, ${reward} Coins.`,
  gaveUp: () => 'Ok, dann lauf ich halt. Bis später!',
  chat: ['Gib Gas, die Sonne geht gleich unter!', 'Fahr mal am Freibad vorbei, heiß heute.', 'Pass auf die Autos auf, die bremsen nicht für jeden.',
    'Dein Scooter zieht echt gut!', 'Nachher noch ’ne Runde Slalom?', 'Die Polizeiwache hat neuerdings offen, schon drin gewesen?'],
  crash: ['BRUDER! Willst du uns umbringen?!', 'Aua! Das zahlt meine Versicherung nicht.', 'Ich steig gleich ab, ich schwör!'],
  hit: ['Ey, vorsichtig!', 'Das war knapp … also nicht knapp genug.', 'Mein Rücken!'],
  wheelie: ['Wheelie zu zweit?! Du bist verrückt!', 'WOOOH! Halt ihn oben!'],
  fast: ['Schneller, schneller!', 'Jetzt fliegen wir!'],
  swim: ['Ich bleib beim Scooter, schwimm du ruhig.'],
};
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// `range` = how far from the rider (metres) he waits for the first pick-up.
export function createBuddy(firstCall = 14, range = [55, 260]) {
  return { phase: 'away', timer: firstCall, range, spot: null, dest: null, near: false, patience: 0, talk: 0, cooldown: 0, rides: 0 };
}
function chooseSpot(from, random, min, max, exclude = null) {
  const scored = BUDDY_SPOTS.filter(s => s !== exclude).map(s => ({ s, d: Math.hypot(s.x - from.x, s.z - from.z) }));
  const fits = scored.filter(e => e.d >= min && e.d <= max);
  if (fits.length) return pick(fits, random).s;
  // Nothing in the comfortable band: take the spot closest to that band.
  return scored.sort((a, b) => Math.abs(a.d - (min + max) / 2) - Math.abs(b.d - (min + max) / 2))[0].s;
}
export function rideReward(from, to) {
  return Math.min(800, 200 + Math.round(Math.hypot(to.x - from.x, to.z - from.z) / 10) * 10);
}

// ctx = {x,z,speed,interact,riding}. `riding` is false while swimming, on foot or fallen.
// Returns events: call | gaveUp | pickup | dropoff | chat, each with a ready-made text.
export function updateBuddy(state, ctx, dt, random = Math.random) {
  const events = [];
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (state.phase === 'away') {
    state.near = false;
    if (!ctx.riding) return events;
    state.timer -= dt;
    if (state.timer <= 0) {
      state.spot = chooseSpot(ctx, random, state.range[0], state.range[1]);
      state.range = [55, 260];
      state.phase = 'waiting'; state.patience = 150;
      events.push({ type: 'call', spot: state.spot, text: LINES.call(state.spot.name) });
    }
  } else if (state.phase === 'waiting') {
    state.patience -= dt;
    const distance = Math.hypot(ctx.x - state.spot.x, ctx.z - state.spot.z);
    state.near = ctx.riding && distance < PICKUP_RADIUS && Math.abs(ctx.speed) < SLOW;
    if (state.near && ctx.interact) {
      state.dest = chooseSpot(state.spot, random, 110, 420, state.spot);
      state.phase = 'riding'; state.near = false; state.talk = 14; state.from = state.spot;
      events.push({ type: 'pickup', dest: state.dest, used: true, text: LINES.pickup(state.dest.name) });
    } else if (state.patience <= 0) {
      state.phase = 'away'; state.timer = 40 + random() * 40; state.spot = null; state.near = false;
      events.push({ type: 'gaveUp', text: LINES.gaveUp() });
    }
  } else if (state.phase === 'riding') {
    const distance = Math.hypot(ctx.x - state.dest.x, ctx.z - state.dest.z);
    if (ctx.riding && distance < DROP_RADIUS && Math.abs(ctx.speed) < SLOW) {
      const reward = rideReward(state.from, state.dest);
      events.push({ type: 'dropoff', reward, spot: state.dest, text: LINES.dropoff(reward) });
      state.phase = 'away'; state.timer = 45 + random() * 65; state.rides++;
      state.spot = null; state.dest = null;
    } else if (ctx.riding) {
      state.talk -= dt;
      if (state.talk <= 0) {
        state.talk = 16 + random() * 12;
        events.push({ type: 'chat', text: pick(LINES.chat, random) });
      }
    }
  }
  return events;
}
// Spontaneous comment while riding along (crash | hit | wheelie | fast | swim), rate-limited.
export function buddyReact(state, kind, random = Math.random) {
  if (state.phase !== 'riding' || state.cooldown > 0 || !LINES[kind]) return null;
  state.cooldown = kind === 'crash' ? 3 : 9;
  state.talk = Math.max(state.talk, 10);
  return pick(LINES[kind], random);
}
