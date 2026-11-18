// Traffic and pedestrians: the city alive around the player. Traffic cars drive
// along the road grid, turn at intersections, and slow down for the car ahead.
// Pedestrians walk the sidewalks, scatter when a car screeches past, and go down
// (not dead — this is a game) when hit, which the police notice.

import { CAR, PED_COLORS, TRAFFIC_COLORS } from './config.js';
import { ROAD_HALF, ROADS_H, ROADS_V, pointInBuilding } from './city.js';

const TRAFFIC_COUNT = 14;
const PED_COUNT = 18;
const KINDS = ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'truck'];

export function createTraffic(city, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) cars.push(spawnTrafficCar(city, rng));
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) peds.push(spawnPed(city, rng));
  return { cars, peds };
}

function spawnTrafficCar(city, rng) {
  const vertical = rng.chance(0.5);
  const line = vertical ? rng.pick(ROADS_V) : rng.pick(ROADS_H);
  const along = rng.range(80, 2320);
  const dir = rng.chance(0.5) ? 1 : -1;
  const lane = (rng.chance(0.5) ? 1 : -1) * (ROAD_HALF - 12);
  const x = vertical ? line + lane : along;
  const y = vertical ? along : line + lane;
  const angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
  return {
    x, y, angle, speed: rng.range(90, 150),
    kind: rng.pick(KINDS), color: rng.pick(TRAFFIC_COLORS),
    axis: vertical ? 'v' : 'h', line, dir, hp: 60, honk: 0,
  };
}

function spawnPed(city, rng) {
  // On a sidewalk: just off a road, inside a block edge, never inside a building.
  for (let tries = 0; tries < 20; tries += 1) {
    const x = rng.range(120, 2280);
    const y = rng.range(120, 1660);
    if (pointInBuilding(city.buildings, x, y)) continue;
    const nearRoad = ROADS_V.some((r) => Math.abs(x - r) < ROAD_HALF + 26) || ROADS_H.some((r) => Math.abs(y - r) < ROAD_HALF + 26);
    if (!nearRoad) continue;
    return {
      x, y, angle: rng.range(0, Math.PI * 2), speed: rng.range(28, 52),
      color: rng.pick(PED_COLORS), state: 'walk', down: 0,
      tx: x, ty: y, wait: rng.range(0, 4),
    };
  }
  return { x: 600, y: 600, angle: 0, speed: 40, color: '#ffcc80', state: 'walk', down: 0, tx: 600, ty: 600, wait: 0 };
}

function nearestCross(axis, line, pos, dir) {
  const lines = axis === 'v' ? ROADS_H : ROADS_V;
  let best = null;
  for (const l of lines) {
    const d = (l - pos) * dir;
    if (d > 10 && (best === null || d < best)) best = d;
  }
  return best === null ? null : pos + best * dir;
}

/** One step for every traffic car and pedestrian. */
export function stepTraffic(traffic, city, dt, rng, playerX, playerY, playerSpeed) {
  for (const car of traffic.cars) {
    // Slow for the car ahead on the same road.
    let target = car.kind === 'truck' ? 95 : car.kind === 'van' ? 115 : 140;
    for (const other of traffic.cars) {
      if (other === car || other.axis !== car.axis || other.line !== car.line || other.dir !== car.dir) continue;
      const along = car.axis === 'v' ? other.y - car.y : other.x - car.x;
      if (along * car.dir > 0 && along * car.dir < 70) target = Math.min(target, 40);
    }
    car.speed += Math.max(-260 * dt, Math.min(160 * dt, target - car.speed));
    const step = car.speed * dt;
    if (car.axis === 'v') car.y += step * car.dir;
    else car.x += step * car.dir;
    // At an intersection, sometimes turn onto the cross road.
    const cross = nearestCross(car.axis, car.line, car.axis === 'v' ? car.y : car.x, car.dir);
    if (cross !== null) {
      const at = car.axis === 'v' ? car.y : car.x;
      if (Math.abs(at - cross) < 4 && rng.chance(0.3)) {
        const lines = car.axis === 'v' ? ROADS_V : ROADS_H;
        const newLine = cross;
        const newDir = rng.chance(0.5) ? 1 : -1;
        const lane = (rng.chance(0.5) ? 1 : -1) * (ROAD_HALF - 12);
        car.axis = car.axis === 'v' ? 'h' : 'v';
        car.line = newLine;
        car.dir = newDir;
        if (car.axis === 'v') {
          car.x = newLine + lane;
          car.angle = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          car.y = newLine + lane;
          car.angle = newDir > 0 ? 0 : Math.PI;
        }
        // Keep the car on the grid after the turn.
        if (car.axis === 'v') car.y = cross;
        else car.x = cross;
      }
    }
    // Wrap around the city edge so traffic never runs out.
    if (car.axis === 'v' && (car.y < 60 || car.y > 1760)) car.y = car.y < 60 ? 1740 : 80;
    if (car.axis === 'h' && (car.x < 60 || car.x > 2340)) car.x = car.x < 60 ? 2320 : 80;
    if (car.honk > 0) car.honk -= dt;
  }

  for (const ped of traffic.peds) {
    if (ped.state === 'down') {
      ped.down -= dt;
      if (ped.down <= 0) {
        ped.state = 'walk';
        ped.tx = ped.x + rng.range(-160, 160);
        ped.ty = ped.y + rng.range(-160, 160);
      }
      continue;
    }
    // A fast car nearby makes pedestrians scatter away from the road.
    const dx = ped.x - playerX;
    const dy = ped.y - playerY;
    const d = Math.hypot(dx, dy);
    if (playerSpeed > 260 && d < 130 && ped.state !== 'flee') {
      ped.state = 'flee';
      ped.tx = ped.x + (dx / (d || 1)) * 220;
      ped.ty = ped.y + (dy / (d || 1)) * 220;
    }
    if (ped.wait > 0) {
      ped.wait -= dt;
      continue;
    }
    const tx = ped.tx - ped.x;
    const ty = ped.ty - ped.y;
    const td = Math.hypot(tx, ty);
    if (td < 12) {
      ped.wait = rng.range(1, 5);
      ped.tx = Math.max(120, Math.min(2280, ped.x + rng.range(-260, 260)));
      ped.ty = Math.max(120, Math.min(1660, ped.y + rng.range(-260, 260)));
      continue;
    }
    const speed = ped.state === 'flee' ? 150 : ped.speed;
    const nx = ped.x + (tx / td) * speed * dt;
    const ny = ped.y + (ty / td) * speed * dt;
    if (!pointInBuilding(city.buildings, nx, ny)) {
      ped.x = nx;
      ped.y = ny;
      ped.angle = Math.atan2(ty, tx);
    } else {
      ped.tx = ped.x + rng.range(-200, 200);
      ped.ty = ped.y + rng.range(-200, 200);
    }
    if (ped.state === 'flee' && td > 260) ped.state = 'walk';
  }
}

/** A pedestrian is hit: they go down for a while and the police take notice. */
export function knockPed(ped) {
  if (ped.state === 'down') return false;
  ped.state = 'down';
  ped.down = 4;
  return true;
}

/** Length/width of a traffic car by kind (for drawing and collisions). */
export function trafficSize(kind) {
  if (kind === 'truck') return { len: 78, wid: 32 };
  if (kind === 'van') return { len: 62, wid: 30 };
  return { len: CAR.length, wid: CAR.width };
}
