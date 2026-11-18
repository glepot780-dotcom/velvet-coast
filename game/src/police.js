// The Velvet Coast police: wanted level, pursuit cars and roadblocks. The wanted
// level rises with crime and falls when the player stays clean and out of sight.
// Police spawn at the city edge, chase the player's position, ram, and at four
// stars and above park roadblocks across the road ahead.

import { CAR, WANTED, WORLD } from './config.js';
import { collideCircle } from './city.js';

export function createPolice(rng) {
  return { cars: [], roadblocks: [], wanted: 0, heat: 0, cleanTimer: 0, spawnTimer: 0, rng };
}

/** Crime adds heat; heat crosses whole stars. */
export function addHeat(police, amount) {
  police.heat = Math.min(5, police.heat + amount);
  police.wanted = Math.floor(police.heat);
  police.cleanTimer = 0;
}

export function dropWanted(police, stars) {
  police.heat = Math.max(0, police.heat - stars);
  police.wanted = Math.floor(police.heat);
  if (police.wanted === 0) {
    police.cars.length = 0;
    police.roadblocks.length = 0;
  }
}

function spawnPoliceCar(police, px, py) {
  const rng = police.rng;
  // At an edge point away from the player, so the siren arrives before the car.
  const side = rng.int(0, 3);
  const x = side === 0 ? rng.range(120, 2280) : side === 1 ? rng.range(120, 2280) : side === 2 ? 120 : 2280;
  const y = side === 0 ? 120 : side === 1 ? 1660 : rng.range(120, 1660);
  police.cars.push({
    x, y, angle: Math.atan2(py - y, px - x), speed: 0,
    hp: 60, siren: rng.range(0, 1), stuck: 0, ramCooldown: 0,
  });
}

function spawnRoadblock(police, px, py) {
  const rng = police.rng;
  const angle = rng.range(0, Math.PI);
  const d = 260;
  const bx = Math.max(200, Math.min(2200, px + Math.cos(angle) * d));
  const by = Math.max(200, Math.min(1560, py + Math.sin(angle) * d));
  police.roadblocks.push({ x: bx, y: by, angle: angle + Math.PI / 2, hp: 80 });
}

/**
 * One step: keep the right number of pursuit cars for the wanted level, move
 * them toward the player, and lay roadblocks at four stars and above.
 */
export function stepPolice(police, world, dt) {
  const px = world.player.x;
  const py = world.player.y;
  const wantedCars = Math.min(WANTED.maxCars, police.wanted * WANTED.perStar);

  police.spawnTimer -= dt;
  if (police.cars.length < wantedCars && police.spawnTimer <= 0) {
    spawnPoliceCar(police, px, py);
    police.spawnTimer = 1.6;
  }
  if (police.wanted >= 4 && police.roadblocks.length < police.wanted - 3 && police.spawnTimer <= -1) {
    spawnRoadblock(police, px, py);
    police.spawnTimer = 0;
  }

  // Heat fades when the player is clean and no police car can see them.
  let seen = false;
  for (const car of police.cars) {
    const d = Math.hypot(car.x - px, car.y - py);
    if (d < WANTED.sight) seen = true;
  }
  if (police.wanted > 0 && !seen && !world.crimeRecently) {
    police.cleanTimer += dt;
    if (police.cleanTimer >= WANTED.decaySeconds) {
      dropWanted(police, 1);
      police.cleanTimer = 0;
    }
  } else {
    police.cleanTimer = 0;
  }

  for (const car of police.cars) {
    const dx = px - car.x;
    const dy = py - car.y;
    const d = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-2.4, Math.min(2.4, diff * 2.2));
    const top = 470 + police.wanted * 22;
    car.speed = Math.min(top, car.speed + 380 * dt);
    car.angle += steer * dt * Math.min(1, car.speed / 200 + 0.25);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const hit = collideCircle(world.city.buildings, nx, ny, 20);
    if (Math.hypot(hit.x - nx, hit.y - ny) > 0.5) {
      // Brushed a wall: slow down and slide along it instead of pushing through.
      car.speed *= 0.55;
      car.stuck += dt;
      if (car.stuck > 1.2) {
        car.angle += Math.PI / 2;
        car.stuck = 0;
      }
    } else {
      car.stuck = 0;
    }
    car.x = Math.max(80, Math.min(WORLD.width - 80, hit.x));
    car.y = Math.max(80, Math.min(WORLD.height - 80, hit.y));
    car.siren = (car.siren + dt * 2.2) % 1;
    if (car.ramCooldown > 0) car.ramCooldown -= dt;
  }
  // Dead pursuit cars are removed by the world (explosion); keep the list clean.
  for (let i = police.cars.length - 1; i >= 0; i -= 1) {
    if (police.cars[i].hp <= 0) police.cars.splice(i, 1);
  }
  for (let i = police.roadblocks.length - 1; i >= 0; i -= 1) {
    if (police.roadblocks[i].hp <= 0) police.roadblocks.splice(i, 1);
  }
}

/** The nearest police car, for the siren volume and the minimap. */
export function nearestPolice(police, x, y) {
  let best = Infinity;
  for (const car of police.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < best) best = d;
  }
  return best;
}
