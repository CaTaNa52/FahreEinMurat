// Browser platform rules: installation always requires explicit user action.
export const INSTALL_DISMISSED = 'murat-pwa-install-dismissed-session';
export function isStandalone(win=window) {
  return !!(win.matchMedia?.('(display-mode: standalone)').matches ||
    win.navigator?.standalone === true);
}
export function isAppleMobile(navigatorRef=navigator) {
  return /iphone|ipad|ipod/i.test(navigatorRef.userAgent) ||
    (navigatorRef.platform==='MacIntel'&&navigatorRef.maxTouchPoints>1);
}
export function registerGameServiceWorker(){
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  const register=()=>navigator.serviceWorker.register('/sw.js').catch(error=>{
    console.info('PWA service worker could not register:',error);
  });
  if(document.readyState==='complete')register();
  else window.addEventListener('load',register,{once:true});
}
