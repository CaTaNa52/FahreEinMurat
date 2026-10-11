// A single source of truth for keyboard and multitouch inputs.
// Each pointer and each physical key owns its actions, preventing one finger
// from releasing another finger's gas, brake, steering or wheelie.
export const INPUT_ACTIONS = ['forward', 'back', 'left', 'right', 'brake', 'wheelie'];

export function gestureActions(origin, mode) {
  if (mode === 'brake') return { brake: true };
  if (mode === 'wheelie') return origin === 'gas'
    ? { forward: true, wheelie: true }
    : { wheelie: true };
  return { forward: true };
}

export function createInputRouter(controls) {
  const keyboard = new Map();
  const pointers = new Map();
  function sync() {
    const all = [...keyboard.values(), ...pointers.values()];
    for (const action of INPUT_ACTIONS) {
      controls.current[action] = all.some(flags => !!flags[action]);
    }
  }
  return {
    setKey(code, action, pressed) {
      if (pressed) keyboard.set(code, { [action]: true });
      else keyboard.delete(code);
      sync();
    },
    setPointer(id, actions) {
      pointers.set(id, actions);
      sync();
    },
    clearPointer(id) {
      pointers.delete(id);
      sync();
    },
    clearAll() {
      keyboard.clear();
      pointers.clear();
      sync();
    },
    // Deterministic snapshot helps test physical keyboard + two-finger overlap.
    snapshot() {
      return Object.fromEntries(INPUT_ACTIONS.map(action => [action, controls.current[action]]));
    },
  };
}
