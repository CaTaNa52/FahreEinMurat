import { useEffect, useRef, useState } from 'react';
import { isStandalone, isAppleMobile, INSTALL_DISMISSED } from './pwa.js';

function sessionDismissed(){
  try{return sessionStorage.getItem(INSTALL_DISMISSED)==='1';}
  catch{return false;}
}
export default function InstallPrompt({started=false}){
  const [installed,setInstalled]=useState(()=>isStandalone());
  const [expanded,setExpanded]=useState(()=>!isStandalone()&&!sessionDismissed());
  const [deferred,setDeferred]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const eventRef=useRef(null);
  const ios=isAppleMobile();
  useEffect(()=>{
    const prompt=e=>{
      e.preventDefault(); // We show our own game-styled installation button.
      eventRef.current=e;setDeferred(true);
    };
    const done=()=>{setInstalled(true);setExpanded(false);eventRef.current=null;setDeferred(false);};
    const mode=()=>{if(isStandalone())done();};
    window.addEventListener('beforeinstallprompt',prompt);
    window.addEventListener('appinstalled',done);
    const mq=window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change',mode);
    return ()=>{
      window.removeEventListener('beforeinstallprompt',prompt);
      window.removeEventListener('appinstalled',done);
      mq?.removeEventListener?.('change',mode);
    };
  },[]);
  useEffect(()=>{if(started){setExpanded(false);}},[started]);
  if(installed)return null;
  const close=()=>{
    setExpanded(false);setShowHelp(false);
    try{sessionStorage.setItem(INSTALL_DISMISSED,'1');}catch{/* unavailable */}
  };
  const install=async()=>{
    const event=eventRef.current;
    if(event){
      eventRef.current=null;setDeferred(false);
      try{
        await event.prompt();
        const choice=await event.userChoice;
        if(choice?.outcome==='accepted')close();
        else setShowHelp(true);
      }catch{setShowHelp(true);}
      return;
    }
    setShowHelp(true); // Browsers cannot be forced to install automatically.
  };
  return <>
    {!expanded&&<button className="pwa-fab" data-testid="install-reopen" type="button"
      aria-label="App-Installation öffnen" onClick={()=>{setExpanded(true);setShowHelp(false);}}>
      <span aria-hidden="true">⬇</span> APP
    </button>}
    {expanded&&<aside className="pwa-prompt" role="dialog" aria-label="FahreEinMurat installieren"
      data-testid="install-prompt">
      <div className="pwa-logo" aria-hidden="true"><img src="/icons/icon-192.png" alt=""/></div>
      <div className="pwa-body">
        <div className="pwa-kicker">ECHTES APP-FEELING</div>
        <strong>FAHRE EIN MURAT installieren</strong>
        <p>Direkt vom Homescreen starten – ohne Browserleiste und mit Offline-Spielwelt.</p>
        {showHelp&&<div className="pwa-help" role="status">
          {ios?<>Auf dem iPhone: in <b>Safari</b> öffnen, unten <b>Teilen</b> <span aria-hidden="true">□↑</span> antippen und <b>Zum Home-Bildschirm</b> wählen. Danach auf <b>Hinzufügen</b> tippen.</>:
            <>Öffne das Browsermenü <b>⋮</b> und wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>. Nutze Chrome oder Edge für die direkte Installationsabfrage.</>}
        </div>}
        <div className="pwa-buttons">
          <button className="pwa-primary" type="button" onClick={install}
            aria-label={deferred?'App jetzt installieren':'App-Installation anzeigen'}>
            {deferred?'JETZT INSTALLIEREN':'APP HINZUFÜGEN'} <span aria-hidden="true">↗</span>
          </button>
          <button className="pwa-later" type="button" onClick={close}>SPÄTER</button>
        </div>
        {ios&&!showHelp&&<small>iPhone: über Safari → Teilen → Zum Home-Bildschirm</small>}
      </div>
      <button className="pwa-close" type="button" aria-label="Installationshinweis schließen" onClick={close}>✕</button>
    </aside>}
  </>;
}
