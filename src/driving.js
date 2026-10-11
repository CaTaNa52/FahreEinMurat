// Deterministic arcade drivetrain shared by mobile touch and desktop keyboard.
// Pedal precedence: brake/reverse wins over gas, never accelerate into a stop.
export const DRIVE_LIMITS = {topForward:23, topReverse:5.5, stopEpsilon:.14};
export function updateDriveSpeed(speed, controls, dt) {
  const step=Math.max(0,Math.min(.05,dt));
  if(!step)return speed;
  const {forward=false,back=false,brake=false}=controls;
  if(brake) {
    // While moving forwards, apply a strong progressive brake. When stopped,
    // holding the SAME button engages a gentle reverse throttle.
    if(speed>DRIVE_LIMITS.stopEpsilon) {
      const slowed=Math.max(0,speed-17*step);
      speed=slowed<=DRIVE_LIMITS.stopEpsilon?0:slowed;
    } else {
      speed=Math.max(-DRIVE_LIMITS.topReverse,Math.min(0,speed)-4.2*step);
    }
  } else if(back && !forward) {
    // Preserve the existing desktop S / Down Arrow reverse shortcuts.
    speed-=8*step;
  } else if(forward){
    if(speed<0) speed=Math.min(0,speed+15*step);
    else speed+=11.5*step;
  } else {
    speed*=Math.exp(-1.7*step);
  }
  speed=Math.max(-DRIVE_LIMITS.topReverse,Math.min(DRIVE_LIMITS.topForward,speed));
  if(!brake && !forward && !back && Math.abs(speed)<.04)return 0;
  return speed;
}
