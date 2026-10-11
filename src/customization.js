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
export function loadProfile(storage){
  const defaults=initialProfile();
  try{
    const raw=JSON.parse(storage.getItem(PROFILE_KEY)||'null');
    if(raw&&typeof raw==='object'){
      return {
        coins:Number.isFinite(raw.coins)?Math.max(0,raw.coins):0,
        garage:{...defaults.garage,...raw.garage},
        rider:{...defaults.rider,...raw.rider},
        owned:Array.isArray(raw.owned)?raw.owned.filter(x=>typeof x==='string'):[]
      };
    }
    // Preserve already earned coins when upgrading from the previous version.
    const old=JSON.parse(storage.getItem('fahre-ein-murat-wallet-v1')||'null');
    if(old&&Number.isFinite(old.coins))defaults.coins=Math.max(0,old.coins);
  }catch{/* blocked storage/private browsing */}
  return defaults;
}
export function chooseUpgrade(profile,category,key,value){
  if(!['garage','rider'].includes(category)||!(key in (category==='garage'?DEFAULT_GARAGE:DEFAULT_RIDER))){
    return {profile,error:'Unbekannte Option.'};
  }
  const id=upgradeId(category,key,value),cost=upgradeCost(category,key,value);
  const already=profile.owned.includes(id);
  if(cost&&!already&&profile.coins<cost)return {profile,error:'Nicht genug Murat-Coins.'};
  return {profile:{
    ...profile,coins:profile.coins-(already?0:cost),
    owned:cost&&!already?[...profile.owned,id]:profile.owned,
    [category]:{...profile[category],[key]:value}
  },paid:already?0:cost};
}
