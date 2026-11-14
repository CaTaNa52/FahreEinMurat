// Pure traffic rules: lane following, car-following, braking for the player and
// circle-vs-oriented-box collision. No React, no timers, fully unit-testable.
import { roadX } from './gameplay.js';

export const LANE = 2.65;                       // lane centre, metres from the road axis
export const CAR_SIZE = { halfW: .98, halfL: 2.25 };
export const TRAFFIC_LIMIT = 560;               // cars wrap around at the map ends
export const CAR_COLORS = ['#e94f64', '#f2c230', '#35c8e8', '#f5f1ea', '#22262c', '#ff8a3d', '#8e6bff', '#3fd08a'];
export const CAR_KINDS = ['sedan', 'sport', 'van', 'sedan', 'taxi', 'sedan'];

const slopeAt = z => roadX(z + .5) - roadX(z - .5);

// World pose of a car; car.t is its position along the road axis (the road's z).
// dir -1 drives towards -z (north), +1 towards +z; cars keep right.
export function carPose(car) {
  const s = slopeAt(car.t), len = Math.hypot(s, 1);
  const off = LANE * (car.dir === -1 ? 1 : -1);
  return {
    x: roadX(car.t) + off / len,
    z: car.t - off * s / len,
    yaw: Math.atan2(s, 1) + (car.dir === 1 ? Math.PI : 0),
  };
}

export function createTraffic(count, random = Math.random, avoidZ = 0, avoidRange = 70) {
  const cars = [];
  const span = TRAFFIC_LIMIT * 2;
  for (let i = 0; i < count; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    let t = -TRAFFIC_LIMIT + (i + .5) * span / count + (random() - .5) * 18;
    // Never start on top of the player.
    if (Math.abs(t - avoidZ) < avoidRange) t = avoidZ + (t >= avoidZ ? avoidRange : -avoidRange);
    const cruise = 8.5 + random() * 5.5;
    const car = {
      id: 'car-' + i, dir, t, speed: cruise, cruise, stun: 0,
      color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length) % CAR_COLORS.length],
      kind: CAR_KINDS[i % CAR_KINDS.length],
    };
    if (car.kind === 'taxi') car.color = '#f2c230';
    Object.assign(car, carPose(car));
    cars.push(car);
  }
  return cars;
}

// Player position in the car's local frame: f = metres ahead, r = metres to the right.
export function localTo(car, x, z) {
  const dx = x - car.x, dz = z - car.z;
  const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
  return { f: dx * fx + dz * fz, r: dx * -fz + dz * fx };
}

// Advances all cars. `player` = {x,z,active}; `blocked` = [zMin,zMax] closed road section.
export function updateTraffic(cars, player, dt, blocked = null) {
  for (const car of cars) {
    let desired = car.cruise;
    if (car.stun > 0) { car.stun = Math.max(0, car.stun - dt); desired = 0; }
    // Keep distance to the car ahead in the same lane.
    for (const other of cars) {
      if (other === car || other.dir !== car.dir) continue;
      const gap = (other.t - car.t) * car.dir;
      if (gap < 0) continue;
      if (gap < 8) desired = 0;
      else if (gap < 22) desired = Math.min(desired, other.speed);
    }
    // Brake for the rider when they are in this car's path.
    if (player?.active) {
      const local = localTo(car, player.x, player.z);
      if (local.f > 0 && local.f < 7 + car.speed * 1.25 && Math.abs(local.r) < 1.95) desired = 0;
    }
    // Closed section (running slalom challenge): wait at the border, never enter.
    if (blocked) {
      const inside = car.t >= blocked[0] && car.t <= blocked[1];
      const border = car.dir === -1 ? blocked[1] : blocked[0];
      const ahead = (border - car.t) * car.dir;
      if (!inside && ahead > 0 && ahead < 16) desired = 0;
    }
    const delta = desired - car.speed;
    car.speed += Math.max(-15 * dt, Math.min(5 * dt, delta));
    if (car.speed < .05 && desired === 0) car.speed = 0;
    car.t += car.dir * car.speed * dt;
    if (car.t * car.dir > TRAFFIC_LIMIT) car.t = -car.dir * TRAFFIC_LIMIT;
    Object.assign(car, carPose(car));
  }
}

// Circle (rider) vs oriented box (car). Returns the push-out normal (car -> rider),
// penetration depth and the car's velocity, or null when they do not touch.
export function collideCar(x, z, radius, car) {
  const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw), rx = -fz, rz = fx;
  const { f, r } = localTo(car, x, z);
  const cf = Math.max(-CAR_SIZE.halfL, Math.min(CAR_SIZE.halfL, f));
  const cr = Math.max(-CAR_SIZE.halfW, Math.min(CAR_SIZE.halfW, r));
  let nf = f - cf, nr = r - cr, dist = Math.hypot(nf, nr), depth;
  if (dist >= radius) return null;
  if (dist < 1e-6) {
    // Centre is inside the box: leave through the nearest side.
    const toSide = CAR_SIZE.halfW - Math.abs(r), toEnd = CAR_SIZE.halfL - Math.abs(f);
    if (toSide < toEnd) { nf = 0; nr = Math.sign(r) || 1; depth = toSide + radius; }
    else { nf = Math.sign(f) || 1; nr = 0; depth = toEnd + radius; }
  } else { nf /= dist; nr /= dist; depth = radius - dist; }
  return {
    nx: nf * fx + nr * rx, nz: nf * fz + nr * rz, depth,
    vx: fx * car.speed, vz: fz * car.speed,
  };
}

// Closing speed along the contact normal (m/s); 0 when moving apart.
export function closingSpeed(hit, playerYaw, playerSpeed) {
  const vx = -Math.sin(playerYaw) * playerSpeed, vz = -Math.cos(playerYaw) * playerSpeed;
  return Math.max(0, -((vx - hit.vx) * hit.nx + (vz - hit.vz) * hit.nz));
}
