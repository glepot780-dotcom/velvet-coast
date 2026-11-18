// The screenshot scenes behind ?shot=chase|mission|garage|dusk. Each one stages a
// real world state — the same world the player plays, the same renderer, the
// same HUD — and then plays it forward a few fixed steps, so the frame is what
// a short game really looks like and the same seed always gives the same frame.
// The cover (chase) is the densest moment: a police chase with wanted stars,
// the minimap, a mission objective and the radio all on screen at once.

import { STEP } from './config.js';
import { addHeat } from './police.js';

const NO_INPUT = { up: false, down: false, left: false, right: false, enter: false, sprint: false, handbrake: false, horn: false, shoot: null };

function driveEast() {
  return { up: true, down: false, left: false, right: false, enter: false, sprint: false, handbrake: false, horn: false, shoot: null };
}

function driveNorth() {
  return { up: true, down: false, left: true, right: false, enter: false, sprint: false, handbrake: false, horn: false, shoot: null };
}

function putPlayerInCar(world, defId, x, y, angle) {
  const s = world.state;
  const def = world.carDef(defId);
  const car = world.state.cars.find((c) => c.defId === defId && c.parked) || null;
  let mine = car;
  if (!mine) {
    mine = { id: 'shot-car', defId, name: def.name, color: def.color, trim: def.trim, x, y, angle, speed: 0, hp: 100, parked: false, target: false, owned: true };
    s.cars.push(mine);
  }
  mine.x = x;
  mine.y = y;
  mine.angle = angle;
  mine.parked = false;
  mine.owned = true;
  s.player.onFoot = false;
  s.player.car = mine;
  s.player.x = x;
  s.player.y = y;
  s.player.angle = angle;
  return mine;
}

function putPolice(world, spots) {
  const police = world.police;
  police.cars.length = 0;
  for (const [x, y, angle] of spots) {
    police.cars.push({ x, y, angle, speed: 380, hp: 60, siren: 0.2, stuck: 0, ramCooldown: 0 });
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any other name stages the chase (the cover).
 */
export function stageShot(name, world) {
  const s = world.state;
  world.reset();

  if (name === 'mission') {
    // On foot in Old Market, collecting envelopes for Marta, morning light.
    s.clock = 9 * 60 + 20;
    s.money = 320;
    s.health = 100;
    world.startMission(2);
    s.player.x = 380;
    s.player.y = 700;
    s.player.angle = Math.PI / 2;
    s.player.onFoot = true;
    s.player.car = null;
    s.camera.x = Math.max(0, Math.min(2400 - 1280, s.player.x - 640));
    s.camera.y = Math.max(0, Math.min(1800 - 720, s.player.y - 360));
    for (let i = 0; i < 20; i += 1) world.step(STEP, NO_INPUT);
    return { screen: 'play', garageSelection: 0 };
  }

  if (name === 'garage') {
    // Benny's Garage, afternoon: money to spend, upgrades half-bought, two cars owned.
    s.clock = 15 * 60 + 40;
    s.money = 1850;
    s.health = 100;
    s.upgrades = { armor: true, engine: false, handling: true };
    s.ownedCars = ['vela', 'coral'];
    s.currentCar = 'coral';
    world.startMission(4);
    s.player.x = 660;
    s.player.y = 430;
    s.player.onFoot = true;
    s.player.car = null;
    s.camera.x = 0;
    s.camera.y = 0;
    for (let i = 0; i < 10; i += 1) world.step(STEP, NO_INPUT);
    return { screen: 'garage', garageSelection: 1 };
  }

  if (name === 'dusk') {
    // The Vault Run at sunset: five stars, the coast road, a roadblock ahead.
    s.clock = 18 * 60 + 45;
    s.money = 3480;
    s.health = 64;
    world.startMission(10);
    s.objectiveIndex = 1;
    s.objectiveTimer = 96;
    putPlayerInCar(world, 'phantom', 700, 1560, 0);
    s.player.car.hp = 64;
    s.player.car.color = '#7c5cff';
    addHeat(world.police, 2);
    putPolice(world, [
      [560, 1560, 0],
      [620, 1480, 0.4],
    ]);
    world.police.roadblocks.push({ x: 1050, y: 1600, angle: Math.PI / 2, hp: 80 });
    for (let i = 0; i < 45; i += 1) world.step(STEP, driveEast());
    return { screen: 'play', garageSelection: 0 };
  }

  // 'chase' (and the default): the Getaway at dusk, four stars, three units on the tail.
  s.clock = 18 * 60 + 30;
  s.money = 1240;
  s.health = 82;
  world.startMission(5);
  addHeat(world.police, 1);
  putPlayerInCar(world, 'coral', 1150, 760, 0);
  s.player.car.hp = 82;
  putPolice(world, [
    [1010, 760, 0],
    [1060, 690, 0.5],
    [980, 830, -0.4],
  ]);
  for (let i = 0; i < 45; i += 1) world.step(STEP, driveEast());
  return { screen: 'play', garageSelection: 0 };
}
