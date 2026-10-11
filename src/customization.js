// All cosmetic choices are persisted offline; no account or backend required.
export const PROFILE_KEY='fahre-ein-murat-profile-v2';
export const DEFAULT_GARAGE={
  model:'city',body:'#53e4ab',trim:'#1d3035',light:'#fff0b8',
  tires:'road',underglow:false,box:false
};
export const DEFAULT_RIDER={
  helmet:true,helmetColor:'#20282d',
  jacket:'#16434c',pants:'#1f2832',
  watch:false,watchColor:'#e5c45d'
};
export const PALETTE=['#53e4ab','#e9eef4','#171e28','#ff733d','#b9a3ff','#f2c94c','#4a8aff'];
export const MODEL_OPTIONS=[
 {value:'city',label:'City',price:0},
 {value:'sport',label:'Sport',price:650},
 {value:'classic',label:'Classic',price:900}
];
export const TIRES_OPTIONS=[
 {value:'road',label:'Straße',price:0},
 {value:'offroad',label:'Offroad',price:350}
];
export const UPGRADE_COSTS={
 'garage:model:sport':650,'garage:model:classic':900,
 'garage:tires:offroad':350,'garage:underglow:true':250,'garage:box:true':400,
 'rider:watch:true':300,'rider:helmet:true':0
};
export const upgradeId=(category,key,value)=>[category,key,String(value)].join(':');
export const upgradeCost=(category,key,value)=>UPGRADE_COSTS[upgradeId(category,key,value)]??0;
export function initialProfile(){
  return {coins:0,garage:{...DEFAULT_GARAGE},rider:{...DEFAULT_RIDER},owned:[]};
}
const asObject=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
// Old saves, partially written localStorage data, and null sections must never crash the 3D studios.
export function normalizeProfile(value) {
  const raw=asObject(value);
  return {
    coins:Number.isFinite(raw.coins)?Math.max(0,raw.coins):0,
    garage:{...DEFAULT_GARAGE,...asObject(raw.garage)},
    rider:{...DEFAULT_RIDER,...asObject(raw.rider)},
    owned:Array.isArray(raw.owned)?raw.owned.filter(id=>typeof id==='string'):[]
  };
}
export function loadProfile(storage){
  try{
    const raw=JSON.parse(storage.getItem(PROFILE_KEY)||'null');
    if(raw&&typeof raw==='object')return normalizeProfile(raw);
    // Preserve coins from the previous wallet version on upgrade.
    const old=JSON.parse(storage.getItem('fahre-ein-murat-wallet-v1')||'null');
    return normalizeProfile({coins:old?.coins});
  }catch{return initialProfile();}
}
export function chooseUpgrade(profile,category,key,value){
  const safe=normalizeProfile(profile);
  if(!['garage','rider'].includes(category)||!(key in (category==='garage'?DEFAULT_GARAGE:DEFAULT_RIDER))){
    return {profile:safe,error:'Unbekannte Option.'};
  }
  const id=upgradeId(category,key,value),cost=upgradeCost(category,key,value);
  const already=safe.owned.includes(id);
  if(cost&&!already&&safe.coins<cost)return {profile:safe,error:'Nicht genug Murat-Coins.'};
  return {profile:{
    ...safe,coins:safe.coins-(already?0:cost),
    owned:cost&&!already?[...safe.owned,id]:safe.owned,
    [category]:{...safe[category],[key]:value}
  },paid:already?0:cost};
}
