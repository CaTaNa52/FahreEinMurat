// Single owner for every physical key and touch, including Safari/PWA fallbacks.
// If a pointerup is swallowed, native touchend/cancel still releases its action.
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
  const pointerInfo = new Map();
  const contacts = new Map();
  const listeners = new Set();
  // Touch.identifier is NOT the same as PointerEvent.pointerId, especially on iOS.
  // Associate the two by their initial contact position whichever event arrives first.
  function bindContacts() {
    const used=new Set([...pointerInfo.values()].map(p=>p.touchId).filter(id=>id!==null));
    for(const p of pointerInfo.values()){
      if(p.kind!=='touch'||p.touchId!==null)continue;
      let nearest=null,dist=48;
      for(const [id,t] of contacts){
        if(used.has(id))continue;
        const d=Math.hypot(p.x-t.x,p.y-t.y);
        if(d<dist){dist=d;nearest=id;}
      }
      if(nearest!==null){p.touchId=nearest;used.add(nearest);}
    }
  }
  function sync() {
    const all = [...keyboard.values(), ...pointers.values()];
    for (const action of INPUT_ACTIONS)
      controls.current[action] = all.some(flags => !!flags[action]);
    for(const listener of [...listeners])listener();
  }
  function drop(id) {
    const existed=pointers.delete(id);
    pointerInfo.delete(id);
    return existed;
  }
  function normalizeTouches(value) {
    return Array.from(value||[],touch=>({
      id:touch.identifier,x:touch.clientX,y:touch.clientY
    }));
  }
  return {
    setKey(code, action, pressed) {
      if (pressed) keyboard.set(code, { [action]: true });
      else keyboard.delete(code);
      sync();
    },
    setPointer(id, actions, meta=null) {
      pointers.set(id,actions);
      if(meta){
        const old=pointerInfo.get(id);
        pointerInfo.set(id,{
          kind:meta.pointerType||old?.kind||'mouse',
          x:meta.clientX??old?.x??0,y:meta.clientY??old?.y??0,
          touchId:old?.touchId??null
        });
        bindContacts();
      }
      sync();
    },
    movePointer(id,x,y){
      const p=pointerInfo.get(id);
      if(p){p.x=x;p.y=y;}
    },
    hasPointer(id){return pointers.has(id);},
    clearPointer(id) {
      if(drop(id))sync();
    },
    trackTouches(phase, changed, remaining) {
      const altered=normalizeTouches(changed);
      const current=normalizeTouches(remaining);
      if(phase==='start'||phase==='move'){
        for(const t of altered)contacts.set(t.id,t);
        bindContacts();
        return;
      }
      // touchend/touchcancel: remove associated pointers EVEN IF pointerup,
      // lostpointercapture or React's onPointerUp never fired.
      const endedIds=new Set(altered.map(t=>t.id));
      const endedPointers=new Set();
      for(const [id,p] of pointerInfo) {
        if(p.kind==='touch'&&p.touchId!==null&&endedIds.has(p.touchId))
          endedPointers.add(id);
      }
      for(const t of altered)contacts.delete(t.id);
      for(const t of current)contacts.set(t.id,t);
      // If a browser skipped an initial touchstart, recover via release position.
      for(const t of altered) {
        if([...endedPointers].some(id=>pointerInfo.get(id)?.touchId===t.id))continue;
        let nearest=null,dist=85;
        for(const [id,p] of pointerInfo) {
          if(p.kind!=='touch'||endedPointers.has(id)||p.touchId!==null)continue;
          const d=Math.hypot(t.x-p.x,t.y-p.y);
          if(d<dist){dist=d;nearest=id;}
        }
        if(nearest!==null)endedPointers.add(nearest);
      }
      // All fingers lifted? A stale touch pointer must never keep GAS on.
      if(current.length===0){
        for(const [id,p] of pointerInfo)if(p.kind==='touch')endedPointers.add(id);
        contacts.clear();
      }
      let modified=false;
      for(const id of endedPointers)modified=drop(id)||modified;
      if(modified)sync();
      bindContacts();
    },
    clearAll() {
      keyboard.clear();
      pointers.clear();
      pointerInfo.clear();
      contacts.clear();
      sync();
    },
    subscribe(listener) {
      listeners.add(listener);
      return ()=>listeners.delete(listener);
    },
    snapshot() {
      return Object.fromEntries(INPUT_ACTIONS.map(action=>[action,controls.current[action]]));
    }
  };
}
