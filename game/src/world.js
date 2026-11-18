// The game's rules and state, with no drawing and no browser in it: the player
// on foot and in cars, the city full of traffic and police, the 12-mission story,
// the wanted level, money and the garage. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react (sound, announce)
// without the world knowing about screens.

import { CAR, CARS, DAY, ECONOMY, FIELD, PLAYER, SAVE_KEY, STEP, WANTED, WORLD } from './config.js';
import { buildCity, collideCircle, districtAt, pointInBuilding } from './city.js';
import { GARAGE_STOCK, MISSIONS, STORY } from './missions.js';
import { createPolice, addHeat, dropWanted, stepPolice } from './police.js';
import { createTraffic, knockPed, stepTraffic, trafficSize } from './traffic.js';

export const EVENT_PICKUP = 1;
export const EVENT_SHOT = 2;
export const EVENT_CRASH = 4;
export const EVENT_OBJECTIVE = 8;
export const EVENT_MISSION_DONE = 16;
export const EVENT_FAIL = 32;
export const EVENT_WIN = 64;
export const EVENT_BUSTED = 128;
export const EVENT_WANTED_UP = 256;
export const EVENT_CASH = 512;
export const EVENT_HORN = 1024;

const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

export function createWorld(rng, save) {
  const city = buildCity(rng);
  const traffic = createTraffic(city, rng);
  const police = createPolice(rng);

  const state = {
    time: 0,
    clock: DAY.startClock,
    day: 1,
    money: ECONOMY.startMoney,
    health: PLAYER.hp,
    ammo: PLAYER.pistolAmmo,
    missionIndex: 0,
    objectiveIndex: 0,
    objectiveTimer: 0,
    tailTime: 0,
    tailLost: 0,
    spotted: 0,
    player: {
      x: city.spawn.x, y: city.spawn.y, angle: -Math.PI / 2,
      onFoot: true, car: null, speed: 0, invuln: 0, sprint: false,
    },
    cars: [],
    bullets: [],
    particles: [],
    pickups: [],
    camera: { x: 0, y: 0 },
    screen: 'title',
    district: 'PALM COURT',
    districtTimer: 0,
    radioLine: 'Coast Radio: smooth traffic on the Strip tonight.',
    radioTimer: 0,
    crimeRecently: 0,
    mission: null,
    missionFailed: '',
    upgrades: { armor: false, engine: false, handling: false },
    ownedCars: ['vela'],
    currentCar: 'vela',
    stats: { earned: 0, missionsDone: 0, carsStolen: 0, chasesEscaped: 0 },
    targetCar: null,
    stealCar: null,
  };

  function loadSave(save) {
    state.money = save.money ?? ECONOMY.startMoney;
    state.missionIndex = Math.min(save.missionIndex ?? 0, MISSIONS.length - 1);
    state.upgrades = save.upgrades ?? { armor: false, engine: false, handling: false };
    state.ownedCars = save.ownedCars ?? ['vela'];
    state.currentCar = save.currentCar ?? 'vela';
    state.stats = save.stats ?? state.stats;
    state.day = MISSIONS[state.missionIndex].day;
  }

  function serialize() {
    return {
      money: state.money,
      missionIndex: state.missionIndex,
      upgrades: state.upgrades,
      ownedCars: state.ownedCars,
      currentCar: state.currentCar,
      stats: state.stats,
    };
  }

  function carDef(id) {
    return CARS.find((c) => c.id === id) || CARS[0];
  }

  function carTopSpeed(def) {
    let top = def.top;
    if (state.upgrades.engine) top *= 1.12;
    return top;
  }

  function spawnParkedCar(defId, x, y, angle) {
    const def = carDef(defId);
    const car = {
      id: `parked-${state.cars.length}-${Math.floor(x)}`,
      defId, name: def.name, color: def.color, trim: def.trim,
      x, y, angle, speed: 0, hp: CAR.hp, parked: true, target: false,
    };
    state.cars.push(car);
    return car;
  }

  function parkSomeCars() {
    const spots = [
      [980, 560, 'vela'], [1500, 900, 'coral'], [420, 620, 'cab'],
      [1700, 1180, 'vela'], [760, 1420, 'coral'], [2080, 1220, 'cab'],
      [1180, 300, 'vela'], [640, 1500, 'coral'],
    ];
    for (const [x, y, defId] of spots) {
      spawnParkedCar(defId, x + rng.range(-30, 30), y + rng.range(-30, 30), rng.range(0, TAU));
    }
    // The player's own car waits by the spawn point.
    const mine = spawnParkedCar(state.currentCar, city.spawn.x + 60, city.spawn.y + 20, 0);
    mine.owned = true;
  }

  function reset() {
    state.time = 0;
    state.clock = DAY.startClock;
    state.day = 1;
    state.money = ECONOMY.startMoney;
    state.health = PLAYER.hp;
    state.ammo = PLAYER.pistolAmmo;
    state.missionIndex = 0;
    state.objectiveIndex = 0;
    state.objectiveTimer = 0;
    state.player.x = city.spawn.x;
    state.player.y = city.spawn.y;
    state.player.angle = -Math.PI / 2;
    state.player.onFoot = true;
    state.player.car = null;
    state.player.speed = 0;
    state.cars.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.pickups.length = 0;
    state.upgrades = { armor: false, engine: false, handling: false };
    state.ownedCars = ['vela'];
    state.currentCar = 'vela';
    state.stats = { earned: 0, missionsDone: 0, carsStolen: 0, chasesEscaped: 0 };
    state.targetCar = null;
    state.stealCar = null;
    police.cars.length = 0;
    police.roadblocks.length = 0;
    police.wanted = 0;
    police.heat = 0;
    parkSomeCars();
  }

  function startMission(index) {
    const def = MISSIONS[index];
    state.missionIndex = index;
    state.mission = def;
    state.day = def.day;
    state.objectiveIndex = 0;
    state.objectiveTimer = 0;
    state.tailTime = 0;
    state.tailLost = 0;
    state.spotted = 0;
    state.targetCar = null;
    state.stealCar = null;
    if (def.heat) {
      police.heat = def.heat;
      police.wanted = def.heat;
    }
    setupObjective(def.objectives[0]);
  }

  function setupObjective(obj) {
    if (!obj) return;
    if (obj.type === 'deliver' || obj.type === 'survive') state.objectiveTimer = obj.seconds || 60;
    if (obj.type === 'tail') {
      // The grey sedan to follow: a traffic car with a fixed loop.
      const car = {
        id: 'target', defId: 'vela', name: 'Grey Sedan', color: '#8a8f98', trim: '#222',
        x: obj.x, y: obj.y, angle: 0, speed: 150, hp: 999, parked: false, target: true,
        axis: 'h', line: obj.y, dir: 1,
      };
      state.cars.push(car);
      state.targetCar = car;
    }
    if (obj.type === 'steal') {
      const car = spawnParkedCar(obj.car || 'coral', obj.x, obj.y, 0);
      car.target = true;
      state.stealCar = car;
    }
  }

  function currentObjective() {
    if (!state.mission) return null;
    return state.mission.objectives[state.objectiveIndex] || null;
  }

  function objectiveDone(events) {
    state.objectiveIndex += 1;
    state.objectiveTimer = 0;
    state.tailTime = 0;
    state.tailLost = 0;
    state.spotted = 0;
    if (state.objectiveIndex >= state.mission.objectives.length) {
      return finishMission(events);
    }
    setupObjective(currentObjective());
    return events | EVENT_OBJECTIVE;
  }

  function finishMission(events) {
    const reward = state.mission.reward;
    state.money += reward;
    state.stats.earned += reward;
    state.stats.missionsDone += 1;
    state.mission = null;
    state.targetCar = null;
    state.stealCar = null;
    if (state.missionIndex >= MISSIONS.length - 1) {
      state.screen = 'win';
      return events | EVENT_MISSION_DONE | EVENT_WIN | EVENT_CASH;
    }
    const next = state.missionIndex + 1;
    if (MISSIONS[next].day !== MISSIONS[state.missionIndex].day) {
      state.screen = 'day';
      state.pendingMission = next;
    } else {
      startMission(next);
    }
    return events | EVENT_MISSION_DONE | EVENT_CASH;
  }

  function failMission(reason) {
    state.missionFailed = reason;
    state.screen = 'over';
    state.mission = null;
    state.targetCar = null;
    state.stealCar = null;
    return EVENT_FAIL;
  }

  function commitCrime(amount) {
    state.crimeRecently = 2;
    const before = police.wanted;
    addHeat(police, amount);
    if (police.wanted > before) return EVENT_WANTED_UP;
    return 0;
  }

  function explode(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = rng.range(0, TAU);
      const s = rng.range(60, 320);
      state.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rng.range(0.4, 1.1), maxLife: 1.1,
        color: rng.chance(0.5) ? color : '#ff8a3d', size: rng.range(3, 9), kind: 'spark',
      });
    }
    state.particles.push({
      x, y, vx: 0, vy: -30, life: 1.6, maxLife: 1.6, color: '#5a6068', size: 26, kind: 'smoke',
    });
  }

  function damagePlayer(amount, events) {
    if (state.player.invuln > 0) return events;
    state.player.invuln = 1;
    state.health -= amount;
    if (state.health <= 0) {
      state.health = 0;
      state.screen = 'over';
      state.missionFailed = 'BUSTED — Chief Danner finally caught you.';
      return events | EVENT_BUSTED;
    }
    return events | EVENT_CRASH;
  }

  function enterCar(car, events) {
    state.player.onFoot = false;
    state.player.car = car;
    car.parked = false;
    if (!car.owned) {
      car.owned = true;
      state.stats.carsStolen += 1;
      events |= commitCrime(1);
    }
    state.player.angle = car.angle;
    state.player.speed = 0;
    return events;
  }

  function exitCar(events) {
    const car = state.player.car;
    if (!car) return events;
    const behind = 34;
    const x = car.x - Math.cos(car.angle) * behind;
    const y = car.y - Math.sin(car.angle) * behind;
    const pos = collideCircle(city.buildings, x, y, PLAYER.radius);
    state.player.x = pos.x;
    state.player.y = pos.y;
    state.player.onFoot = true;
    state.player.car = null;
    car.parked = true;
    car.speed = 0;
    return events;
  }

  function nearestCar(maxD) {
    let best = null;
    let bestD = maxD;
    for (const car of state.cars) {
      if (car.target && state.stealCar === car && state.mission && currentObjective() && currentObjective().type !== 'steal') continue;
      const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
      if (d < bestD) {
        best = car;
        bestD = d;
      }
    }
    return best;
  }

  function shootAt(wx, wy, events) {
    if (state.ammo <= 0 || state.player.pistolCooldown > 0) return events;
    state.ammo -= 1;
    state.player.pistolCooldown = PLAYER.pistolCooldown;
    const dx = wx - state.player.x;
    const dy = wy - state.player.y;
    const d = Math.hypot(dx, dy) || 1;
    state.bullets.push({
      x: state.player.x, y: state.player.y,
      vx: (dx / d) * 950, vy: (dy / d) * 950,
      life: PLAYER.pistolRange / 950, damage: PLAYER.pistolDamage,
    });
    state.particles.push({
      x: state.player.x + (dx / d) * 20, y: state.player.y + (dy / d) * 20,
      vx: 0, vy: 0, life: 0.08, maxLife: 0.08, color: '#ffe082', size: 10, kind: 'flash',
    });
    return events | EVENT_SHOT;
  }

  function buyStock(id) {
    const item = GARAGE_STOCK.find((g) => g.id === id);
    if (!item || state.money < item.cost) return false;
    if (id === 'armor' && state.upgrades.armor) return false;
    if (id === 'engine' && state.upgrades.engine) return false;
    if (id === 'handling' && state.upgrades.handling) return false;
    state.money -= item.cost;
    if (id === 'repair') {
      if (state.player.car) state.player.car.hp = CAR.hp + (state.upgrades.armor ? 40 : 0);
      state.health = PLAYER.hp;
    } else if (id === 'armor') {
      state.upgrades.armor = true;
      if (state.player.car) state.player.car.hp += 40;
    } else if (id === 'engine') state.upgrades.engine = true;
    else if (id === 'handling') state.upgrades.handling = true;
    else if (id === 'ammo') state.ammo += 12;
    else if (id === 'bribe') dropWanted(police, 2);
    return true;
  }

  function buyCar(id) {
    const def = carDef(id);
    if (!def || state.ownedCars.includes(id) || state.money < def.price) return false;
    state.money -= def.price;
    state.ownedCars.push(id);
    state.currentCar = id;
    const car = spawnParkedCar(id, city.garage.x + 100, city.garage.y + 150, 0);
    car.owned = true;
    return true;
  }

  function step(dt, input) {
    let events = 0;
    state.time += dt;
    state.clock += DAY.minutesPerSecond * dt;
    if (state.clock >= 24 * 60) state.clock -= 24 * 60;
    if (state.crimeRecently > 0) state.crimeRecently -= dt;
    if (state.player.invuln > 0) state.player.invuln -= dt;
    if (state.player.pistolCooldown > 0) state.player.pistolCooldown -= dt;
    if (state.districtTimer > 0) state.districtTimer -= dt;

    // Radio chatter rotates every few seconds.
    state.radioTimer -= dt;
    if (state.radioTimer <= 0) {
      const pool = [
        ...(police.wanted === 0 ? ['Coast Radio: smooth traffic on the Strip tonight.', 'Coast Radio: sunset at 19:40, perfect beach weather.', 'Marta: Quiet streets, Rae. Keep it that way.'] : []),
        ...(police.wanted === 1 ? ['VCPD dispatch: one star, keep an eye out near Downtown.', 'VCPD dispatch: a car matching the description was seen.'] : []),
        ...(police.wanted === 2 ? ['VCPD dispatch: two stars, units moving to intercept.', 'VCPD dispatch: the suspect is driving fast. Pursue with care.'] : []),
        ...(police.wanted === 3 ? ['VCPD dispatch: three stars, roadblocks up — box that car in, all units.', 'VCPD dispatch: suspect is armed and mobile. Do not let it reach the pier.'] : []),
        ...(police.wanted === 4 ? ['VCPD dispatch: four stars, all units converge. This one does not get away.', 'Chief Danner: I want that car stopped. Now.'] : []),
        ...(police.wanted >= 5 ? ['VCPD dispatch: five stars. Every unit in the city is on this chase.', 'Chief Danner: Shut down the coast road. Nobody leaves Velvet Coast tonight.'] : []),
      ];
      state.radioLine = pool.length > 0 ? pool[Math.floor(rng.next() * pool.length)] : state.radioLine;
      state.radioTimer = 6;
    }

    const p = state.player;
    if (p.onFoot) {
      const ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const len = Math.hypot(ix, iy) || 1;
      const speed = PLAYER.walkSpeed * (input.sprint ? 1.5 : 1);
      if (ix !== 0 || iy !== 0) {
        p.angle = Math.atan2(iy, ix);
        const nx = p.x + (ix / len) * speed * dt;
        const ny = p.y + (iy / len) * speed * dt;
        const pos = collideCircle(city.buildings, nx, ny, PLAYER.radius);
        p.x = Math.max(40, Math.min(WORLD.width - 40, pos.x));
        p.y = Math.max(40, Math.min(WORLD.height - 40, pos.y));
        p.speed = speed;
      } else {
        p.speed = 0;
      }
      if (input.shoot) events |= shootAt(input.shoot.x, input.shoot.y, events);
      if (input.enter) {
        const car = nearestCar(70);
        if (car) events |= enterCar(car, events);
      }
    } else if (p.car) {
      const car = p.car;
      const def = carDef(car.defId);
      const top = carTopSpeed(def);
      const turnRate = CAR.turn * (state.upgrades.handling ? 1.2 : 1);
      if (input.up) car.speed += CAR.accel * def.accel * dt;
      if (input.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.5) * dt;
      if (!input.up && !input.down) car.speed -= Math.sign(car.speed) * CAR.drag * 120 * dt;
      if (Math.abs(car.speed) < 8 && !input.up && !input.down) car.speed = 0;
      car.speed = Math.max(-CAR.reverse, Math.min(top, car.speed));
      const steer = ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * (car.speed >= 0 ? 1 : -1);
      car.angle += steer * turnRate * dt * Math.min(1, Math.abs(car.speed) / 140 + 0.15);
      if (input.handbrake) {
        car.speed *= Math.max(0, 1 - 3.2 * dt);
        if (Math.abs(car.speed) > 120 && rng.chance(0.5)) {
          state.particles.push({
            x: car.x - Math.cos(car.angle) * 20, y: car.y - Math.sin(car.angle) * 20,
            vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#cfd8dc', size: 5, kind: 'smoke',
          });
        }
      }
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const pos = collideCircle(city.buildings, nx, ny, 24);
      if (car.scrape > 0) car.scrape -= dt;
      if (Math.hypot(pos.x - nx, pos.y - ny) > 0.5) {
        // Scraping a wall at speed hurts — but only once per scrape, not every
        // step, or a car pressed against a wall would melt in a second.
        if (Math.abs(car.speed) > 200 && car.scrape <= 0) {
          car.hp -= 6;
          car.scrape = 0.6;
          events |= EVENT_CRASH;
          explode(car.x, car.y, '#cfd8dc', 4);
        }
        car.speed *= 0.5;
      }
      car.x = Math.max(60, Math.min(WORLD.width - 60, pos.x));
      car.y = Math.max(60, Math.min(WORLD.height - 60, pos.y));
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = Math.abs(car.speed);
      if (car.bump > 0) car.bump -= dt;
      if (input.enter) events |= exitCar(events);
      if (input.horn) events |= EVENT_HORN;
      if (car.hp <= 0) {
        explode(car.x, car.y, '#ff6b5e', 26);
        events |= damagePlayer(30, events);
        const wreck = car;
        state.cars = state.cars.filter((c) => c !== wreck);
        p.car = null;
        p.onFoot = true;
        p.x = wreck.x;
        p.y = wreck.y;
        p.invuln = 1.5;
      }
    }

    // Car-to-car and car-to-pedestrian collisions.
    const driven = p.car;
    const allCars = [...state.cars, ...traffic.cars, ...police.cars];
    if (driven) {
      for (const other of allCars) {
        if (other === driven) continue;
        const d = Math.hypot(other.x - driven.x, other.y - driven.y);
        const minD = 30;
        if (d < minD && d > 0.01) {
          const push = (minD - d) / 2;
          const ux = (driven.x - other.x) / d;
          const uy = (driven.y - other.y) / d;
          driven.x += ux * push;
          driven.y += uy * push;
          if (other.parked !== undefined || other.axis) {
            other.x -= ux * push;
            other.y -= uy * push;
          }
          const rel = Math.abs(driven.speed - (other.speed || 0));
          if (rel > 140 && driven.bump <= 0) {
            driven.hp -= 8;
            driven.bump = 0.5;
            if (other.hp !== undefined) other.hp -= 10;
            events |= EVENT_CRASH;
            explode(driven.x, driven.y, '#ffd54f', 6);
            if (police.cars.includes(other)) events |= commitCrime(0.5);
          }
        }
      }
      for (const ped of traffic.peds) {
        if (ped.state === 'down') continue;
        const d = Math.hypot(ped.x - driven.x, ped.y - driven.y);
        if (d < 30 && Math.abs(driven.speed) > 60) {
          if (knockPed(ped)) {
            events |= commitCrime(1);
            events |= EVENT_CRASH;
          }
        }
      }
    }

    // Bullets fly and hit cars.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        for (const target of [...police.cars, ...police.roadblocks, ...traffic.cars]) {
          const d = Math.hypot(target.x - b.x, target.y - b.y);
          if (d < 26) {
            target.hp -= b.damage;
            dead = true;
            explode(b.x, b.y, '#ffe082', 5);
            if (police.cars.includes(target) || police.roadblocks.includes(target)) {
              events |= commitCrime(0.5);
              if (target.hp <= 0) {
                explode(target.x, target.y, '#ff6b5e', 24);
                dropPickup(target.x, target.y);
              }
            }
            break;
          }
        }
        if (!dead && pointInBuilding(city.buildings, b.x, b.y)) {
          explode(b.x, b.y, '#b0bec5', 3);
          dead = true;
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // Pickups: cash and ammo dropped by wrecked police cars.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pk = state.pickups[i];
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < 36) {
        if (pk.kind === 'cash') {
          state.money += pk.amount;
          events |= EVENT_CASH;
        } else if (pk.kind === 'ammo') {
          state.ammo += pk.amount;
          events |= EVENT_PICKUP;
        } else {
          state.health = Math.min(PLAYER.hp, state.health + pk.amount);
          events |= EVENT_PICKUP;
        }
        state.pickups.splice(i, 1);
      }
    }

    // The tail target drives its loop.
    if (state.targetCar) {
      const t = state.targetCar;
      t.speed = 150;
      if (t.axis === 'h') t.x += t.speed * dt * t.dir;
      else t.y += t.speed * dt * t.dir;
      if (t.axis === 'h' && (t.x > 2200 || t.x < 200)) {
        t.dir *= -1;
        t.angle = t.dir > 0 ? 0 : Math.PI;
      }
      if (t.axis === 'v' && (t.y > 1600 || t.y < 200)) {
        t.dir *= -1;
        t.angle = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }

    // Police cars ram the player.
    for (const pc of police.cars) {
      const d = Math.hypot(pc.x - p.x, pc.y - p.y);
      if (d < 34 && pc.ramCooldown <= 0) {
        pc.ramCooldown = 1.2;
        pc.speed *= 0.4;
        if (p.car) {
          p.car.hp -= CAR.ramDamage;
          events |= EVENT_CRASH;
          if (p.car.hp <= 0) {
            explode(p.car.x, p.car.y, '#ff6b5e', 26);
            events |= damagePlayer(30, events);
            state.cars = state.cars.filter((c) => c !== p.car);
            p.car = null;
            p.onFoot = true;
            p.invuln = 1.5;
          }
        } else {
          events |= damagePlayer(12, events);
        }
      }
    }

    stepTraffic(traffic, city, dt, rng, p.x, p.y, p.speed);
    stepPolice(police, { player: p, city, crimeRecently: state.crimeRecently > 0 }, dt);

    // Mission objectives, in order.
    if (state.mission) {
      const obj = currentObjective();
      if (obj) {
        if (obj.type === 'goto' || obj.type === 'pickup') {
          const d = Math.hypot(obj.x - p.x, obj.y - p.y);
          if (d < 46) {
            if (obj.type === 'pickup') events |= EVENT_PICKUP;
            events = objectiveDone(events);
          }
        } else if (obj.type === 'deliver') {
          state.objectiveTimer -= dt;
          const d = Math.hypot(obj.x - p.x, obj.y - p.y);
          if (d < 46) events = objectiveDone(events);
          else if (state.objectiveTimer <= 0) events |= failMission('Too slow — the delivery window closed.');
        } else if (obj.type === 'tail' && state.targetCar) {
          const d = Math.hypot(state.targetCar.x - p.x, state.targetCar.y - p.y);
          if (d < 70) {
            state.spotted += dt;
            if (state.spotted > 3) events |= failMission('Spotted! The sedan made you and drove off.');
          } else if (d < 420) {
            state.tailTime += dt;
            state.tailLost = 0;
            if (state.tailTime >= (obj.seconds || 25)) events = objectiveDone(events);
          } else {
            state.tailLost += dt;
            if (state.tailLost > 3) events |= failMission('You lost the sedan in traffic.');
          }
        } else if (obj.type === 'steal' && state.stealCar && !p.onFoot && p.car === state.stealCar) {
          events = objectiveDone(events);
        } else if (obj.type === 'escape') {
          if (police.wanted === 0) {
            state.stats.chasesEscaped += 1;
            events = objectiveDone(events);
          } else {
            const d = Math.hypot(obj.x - p.x, obj.y - p.y);
            if (d < 60 && police.wanted <= 1) {
              dropWanted(police, 5);
              state.stats.chasesEscaped += 1;
              events = objectiveDone(events);
            }
          }
        } else if (obj.type === 'survive') {
          state.objectiveTimer -= dt;
          if (state.objectiveTimer <= 0) events = objectiveDone(events);
        }
      }
    }

    // Particles fade.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }

    // District label when the player crosses into a new district.
    const district = districtAt(p.x, p.y);
    if (district !== state.district) {
      state.district = district;
      state.districtTimer = 2.2;
    }

    // Camera follows the player, clamped to the city.
    state.camera.x = Math.max(0, Math.min(WORLD.width - FIELD.width, p.x - FIELD.width / 2));
    state.camera.y = Math.max(0, Math.min(WORLD.height - FIELD.height, p.y - FIELD.height / 2));

    return events;
  }

  function dropPickup(x, y) {
    const kind = rng.chance(0.5) ? 'cash' : rng.chance(0.5) ? 'ammo' : 'health';
    state.pickups.push({
      x: x + rng.range(-30, 30), y: y + rng.range(-30, 30),
      kind, amount: kind === 'cash' ? 50 : kind === 'ammo' ? 12 : 25,
    });
  }

  function nearGarage() {
    const g = city.garage;
    return Math.hypot(state.player.x - (g.x + g.w / 2), state.player.y - (g.y + g.h / 2)) < 170;
  }

  function dayPart() {
    const h = state.clock / 60;
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
  }

  reset();
  if (save) loadSave(save);

  return {
    state, city, traffic, police,
    reset, step, startMission, currentObjective, serialize,
    buyStock, buyCar, nearGarage, dayPart, carDef,
    saveKey: SAVE_KEY,
  };
}
