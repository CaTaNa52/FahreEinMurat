// Pan / zoom maths of the big map. Pure, so it can be unit tested.
import { WORLD } from './worldLayout.js';

const HALF=WORLD/2;
export const MAP_ZOOM={min:.35,max:7,start:2.2};   // screen pixels per metre
// The map centre never leaves the world, so you cannot get lost in empty space.
export function clampView(view){
  return {...view,x:Math.max(-HALF,Math.min(HALF,view.x)),z:Math.max(-HALF,Math.min(HALF,view.z))};
}
// Zoom towards a screen point so the spot under the finger stays under the finger.
export function zoomAt(view,factor,sx,sy,width,height){
  const scale=Math.max(MAP_ZOOM.min,Math.min(MAP_ZOOM.max,view.scale*factor));
  const wx=view.x+(sx-width/2)/view.scale, wz=view.z+(sy-height/2)/view.scale;
  return clampView({scale,x:wx-(sx-width/2)/scale,z:wz-(sy-height/2)/scale});
}
// Whole world visible, centred.
export function fitWorld(width,height){
  return {scale:Math.max(MAP_ZOOM.min,Math.min(width,height)/(WORLD*1.04)),x:0,z:0};
}
