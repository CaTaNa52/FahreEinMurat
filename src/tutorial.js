export const TUTORIAL_KEY='fahre-ein-murat-tutorial-seen-v1';
export const TUTORIAL_STEPS=[
  {id:'home',eyebrow:'DEIN RÜCKZUGSORT',title:'Hier ist dein Zuhause 🏠',
    description:'In deinem Haus passt du deinen Fahrer an: Helm aufsetzen oder abnehmen, Jacke und Hose färben, Uhr tragen und vieles mehr. Du erkennst es am Gebäude und kannst es über ZUHAUSE öffnen.'},
  {id:'garage',eyebrow:'DEINE WERKSTATT',title:'Hier ist deine Murat-Garage 🛠️',
    description:'Hier kannst du deinen E-Scooter aufpimpen: Modell, Farben, Reifen, Lichter und Extras. Drehe das 3D-Modell und bezahle besondere Teile mit Murat-Coins.'},
  {id:'challenges',eyebrow:'DEIN ABENTEUER',title:'Auf der Karte warten Challenges 🏆',
    description:'Leuchtende Bodenflächen starten Aufgaben. Meistere Slalom und Wheelies oder suche den versteckten goldenen Schlüssel – ganz ohne Richtungshilfe. Jede erfolgreich wiederholte Challenge bringt Coins.'},
  {id:'controls',eyebrow:'BEREIT ZUM FAHREN',title:'So steuerst du deinen Scooter 🛴',
    description:'Handy: GAS halten und mit demselben Finger zu WHEELIE wischen, mit dem anderen lenken. PC: WASD, Leertaste und Shift. Die Ansicht wechselst du über 1ST/3RD oder V. Viel Spaß!'}
];
export function hasSeenTutorial(storage){
  try{return storage?.getItem(TUTORIAL_KEY)==='1';}catch{return false;}
}
export function markTutorialSeen(storage){
  try{storage?.setItem(TUTORIAL_KEY,'1');}catch{/* Storage unavailable */}
}
