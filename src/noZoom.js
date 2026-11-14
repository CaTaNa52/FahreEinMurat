// Keeps the game at 100 % on phones. Browsers zoom the page on a pinch (two thumbs on
// the steering and gas buttons look like one) or on a quick double tap; afterwards only
// part of the HUD is visible. iOS ignores `user-scalable=no`, so we block the gestures
// themselves and, should a zoom still slip through, snap back to 100 %.
export const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
const DOUBLE_TAP_MS = 350, DOUBLE_TAP_PX = 40;
// Inside these the player may scroll with one finger (studio option lists).
const SCROLLABLE = '.studio-options,.customizer-layer';

export function installNoZoom(win = window, doc = document) {
  const meta = doc.querySelector('meta[name="viewport"]');
  if (meta) meta.setAttribute('content', VIEWPORT);
  const stop = e => { if (e.cancelable) e.preventDefault(); };
  const opts = { passive: false };
  // Safari's own pinch events.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(type, stop, opts);
  // Any multi-finger move is a pinch to the browser; the game only needs the touches themselves.
  const move = e => {
    if (e.touches?.length > 1) stop(e);
    else if (!e.target?.closest?.(SCROLLABLE)) stop(e);
  };
  doc.addEventListener('touchmove', move, opts);
  // Double tap: swallow the second tap's default (the zoom) but keep the tap itself.
  let last = { time: -1e9, x: 0, y: 0 };
  const end = e => {
    const t = e.changedTouches?.[0];
    if (!t || e.touches?.length) return;
    const now = e.timeStamp ?? Date.now();
    const quick = now - last.time < DOUBLE_TAP_MS && Math.hypot(t.clientX - last.x, t.clientY - last.y) < DOUBLE_TAP_PX;
    last = { time: now, x: t.clientX, y: t.clientY };
    if (!quick) return;
    stop(e);
    // preventDefault also cancels the click; deliver it so fast taps on buttons still count.
    const button = e.target?.closest?.('button,[role="button"],a');
    if (button && typeof button.click === 'function') button.click();
  };
  doc.addEventListener('touchend', end, opts);
  doc.addEventListener('dblclick', stop, opts);
  // Ctrl + wheel / trackpad pinch on desktop browsers.
  const wheel = e => { if (e.ctrlKey) stop(e); };
  win.addEventListener('wheel', wheel, opts);
  // Safety net: if the page is zoomed anyway (e.g. an accessibility "force zoom" setting),
  // re-applying the viewport makes the browser jump back to 100 %.
  const vv = win.visualViewport;
  let resetting = false;
  const check = () => {
    if (!vv || vv.scale <= 1.01 || resetting || !meta) return;
    resetting = true;
    meta.setAttribute('content', VIEWPORT.replace('initial-scale=1', 'initial-scale=0.9999'));
    win.setTimeout(() => { meta.setAttribute('content', VIEWPORT); resetting = false; }, 60);
  };
  vv?.addEventListener('resize', check);
  return () => {
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) doc.removeEventListener(type, stop, opts);
    doc.removeEventListener('touchmove', move, opts);
    doc.removeEventListener('touchend', end, opts);
    doc.removeEventListener('dblclick', stop, opts);
    win.removeEventListener('wheel', wheel, opts);
    vv?.removeEventListener('resize', check);
  };
}
