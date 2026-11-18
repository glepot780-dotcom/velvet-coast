// The world painter: Velvet Coast drawn in crisp procedural vector art —
// gradients, glow and day/dusk lighting, all drawn in code, no image assets.
// The camera is the world's camera; this file draws the world in world space
// and leaves the HUD (hud.js) to draw in screen space.

import { FIELD, LIGHT, PALETTE, PLAYER, WORLD } from './config.js';
import { ROADS_H, ROADS_V, ROAD_HALF } from './city.js';
import { trafficSize } from './traffic.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hash(n) {
  let t = (n * 2654435761) >>> 0;
  t ^= t >>> 13;
  t = Math.imul(t, 1597334677);
  t ^= t >>> 15;
  return (t >>> 0) / 4294967296;
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawCar(x, y, angle, color, trim, kind, opts) {
    const size = kind ? trafficSize(kind) : { len: 54, wid: 28 };
    const len = size.len;
    const wid = size.wid;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    roundRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 8);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#14161a';
    ctx.fillRect(-len / 2 + 6, -wid / 2 - 3, 10, 6);
    ctx.fillRect(len / 2 - 16, -wid / 2 - 3, 10, 6);
    ctx.fillRect(-len / 2 + 6, wid / 2 - 3, 10, 6);
    ctx.fillRect(len / 2 - 16, wid / 2 - 3, 10, 6);
    // Body.
    const grad = ctx.createLinearGradient(0, -wid / 2, 0, wid / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shade(color, -28));
    ctx.fillStyle = grad;
    roundRect(ctx, -len / 2, -wid / 2, len, wid, 9);
    ctx.fill();
    // Roof + windshield.
    ctx.fillStyle = trim;
    roundRect(ctx, -len / 2 + 12, -wid / 2 + 6, len - 26, wid - 12, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 220, 255, 0.75)';
    ctx.fillRect(len / 2 - 12, -wid / 2 + 5, 5, wid - 10);
    // Headlights.
    ctx.fillStyle = '#fff8c4';
    ctx.fillRect(len / 2 - 2, -wid / 2 + 3, 3, 5);
    ctx.fillRect(len / 2 - 2, wid / 2 - 8, 3, 5);
    // Police light bar.
    if (opts && opts.police) {
      const phase = opts.phase || 0;
      ctx.fillStyle = phase < 0.5 ? '#ff3b30' : '#2f7bff';
      ctx.fillRect(-6, -wid / 2 + 2, 12, 5);
      ctx.fillStyle = phase < 0.5 ? '#2f7bff' : '#ff3b30';
      ctx.fillRect(-6, wid / 2 - 7, 12, 5);
    }
    // Damage smoke.
    if (opts && opts.hp !== undefined && opts.hp < 35) {
      ctx.fillStyle = 'rgba(90, 96, 104, 0.7)';
      ctx.beginPath();
      ctx.arc(-len / 4, -wid / 4, 7 + hash(Math.floor(opts.hp)) * 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // Target marker above a mission car.
    if (opts && opts.target) {
      ctx.save();
      ctx.translate(x, y - 34);
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(-8, -4);
      ctx.lineTo(8, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBuilding(b, dayPart) {
    // Shadow and base.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, shade(b.color, 18));
    grad.addColorStop(1, shade(b.color, -22));
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Roof inset.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    // Lit windows: a fixed pattern per building, glowing at dusk and night.
    const cols = Math.max(2, Math.floor(b.w / 26));
    const rows = Math.max(2, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        const lit = hash(b.litSeed + cx * 31 + cy * 17) < (dayPart === 'night' ? 0.55 : dayPart === 'dusk' ? 0.45 : 0.18);
        if (!lit) continue;
        ctx.fillStyle = dayPart === 'night' ? 'rgba(255, 214, 120, 0.95)' : 'rgba(255, 226, 150, 0.8)';
        ctx.fillRect(b.x + 12 + cx * 26, b.y + 12 + cy * 26, 12, 12);
      }
    }
    // Name plate on bigger buildings.
    if (b.w > 120 && b.h > 60) {
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(b.name).width;
      ctx.fillStyle = 'rgba(10, 12, 18, 0.55)';
      ctx.fillRect(b.x + b.w / 2 - tw / 2 - 6, b.y + b.h / 2 - 10, tw + 12, 20);
      ctx.fillStyle = '#f2f4f7';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }

  function drawRoads() {
    ctx.fillStyle = PALETTE.road;
    for (const x of ROADS_V) ctx.fillRect(x - ROAD_HALF, 0, ROAD_HALF * 2, WORLD.height);
    for (const y of ROADS_H) ctx.fillRect(0, y - ROAD_HALF, WORLD.width, ROAD_HALF * 2);
    // Sidewalk edges.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const x of ROADS_V) {
      ctx.fillRect(x - ROAD_HALF - 6, 0, 4, WORLD.height);
      ctx.fillRect(x + ROAD_HALF + 2, 0, 4, WORLD.height);
    }
    for (const y of ROADS_H) {
      ctx.fillRect(0, y - ROAD_HALF - 6, WORLD.width, 4);
      ctx.fillRect(0, y + ROAD_HALF + 2, WORLD.width, 4);
    }
    // Lane dashes.
    ctx.fillStyle = PALETTE.lane;
    for (const x of ROADS_V) {
      for (let y = 20; y < WORLD.height; y += 56) ctx.fillRect(x - 2, y, 4, 26);
    }
    for (const y of ROADS_H) {
      for (let x = 20; x < WORLD.width; x += 56) ctx.fillRect(x, y - 2, 26, 4);
    }
    // Crosswalks at every intersection.
    ctx.fillStyle = 'rgba(240, 240, 240, 0.75)';
    for (const x of ROADS_V) {
      for (const y of ROADS_H) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(x + i * 9 - 3, y - ROAD_HALF - 2, 6, 8);
          ctx.fillRect(x + i * 9 - 3, y + ROAD_HALF - 6, 6, 8);
        }
      }
    }
  }

  function draw(world, dayPart) {
    const state = world.state;
    const cam = state.camera;
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Ground: grass base, sand along the south beach, water beyond it.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, 1600, WORLD.width, 140);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 1740, WORLD.width, 60);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let x = 0; x < WORLD.width; x += 90) {
      const w = 40 + hash(x) * 30;
      ctx.fillRect(x, 1746 + hash(x + 7) * 8, w, 3);
    }

    // Parks.
    for (const park of world.city.parks) {
      ctx.fillStyle = PALETTE.grassDark;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      for (let i = 0; i < park.trees; i += 1) {
        const tx = park.x + 20 + hash(park.x + i * 13) * (park.w - 40);
        const ty = park.y + 20 + hash(park.y + i * 29) * (park.h - 40);
        ctx.fillStyle = '#4e7a3d';
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#5d8f47';
        ctx.beginPath();
        ctx.arc(tx - 4, ty - 4, 7, 0, TAU);
        ctx.fill();
      }
    }

    drawRoads();
    for (const b of world.city.buildings) drawBuilding(b, dayPart);

    // Garage forecourt and sign.
    const g = world.city.garage;
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = '#f2c94c';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText("BENNY'S GARAGE", g.x + g.w / 2, g.y + g.h / 2 - 4);
    ctx.fillStyle = '#a7adb8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Press G — upgrades & cars', g.x + g.w / 2, g.y + g.h / 2 + 14);

    // Mission marker: a pulsing beacon the player can always find.
    const obj = state.mission ? state.mission.objectives[state.objectiveIndex] : null;
    if (obj && obj.x !== undefined) {
      const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
      ctx.strokeStyle = `rgba(255, 217, 77, ${0.5 + 0.4 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 26 + 8 * pulse, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
      ctx.fillRect(obj.x - 3, obj.y - 130, 6, 130);
    }

    // Pickups dropped by wrecked police cars.
    for (const pk of state.pickups) {
      ctx.fillStyle = pk.kind === 'cash' ? '#7ed491' : pk.kind === 'ammo' ? '#ffd94d' : '#ff6b5e';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#10141e';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'ammo' ? 'A' : '+', pk.x, pk.y + 1);
    }

    // Parked and mission cars.
    for (const car of state.cars) {
      drawCar(car.x, car.y, car.angle, car.color, car.trim, null, { hp: car.hp, target: car.target });
    }
    // Traffic.
    for (const car of world.traffic.cars) {
      drawCar(car.x, car.y, car.angle, car.color, '#22222a', car.kind, { hp: car.hp });
    }
    // Roadblocks: two police cars parked across the road.
    for (const rb of world.police.roadblocks) {
      drawCar(rb.x - 34, rb.y, rb.angle, '#e8eaf0', '#1f2430', null, { police: true, phase: 0.2, hp: rb.hp });
      drawCar(rb.x + 34, rb.y, rb.angle, '#e8eaf0', '#1f2430', null, { police: true, phase: 0.7, hp: rb.hp });
    }
    // Police pursuit cars.
    for (const car of world.police.cars) {
      drawCar(car.x, car.y, car.angle, '#e8eaf0', '#1f2430', null, { police: true, phase: car.siren, hp: car.hp });
    }

    // Pedestrians.
    for (const ped of world.traffic.peds) {
      ctx.save();
      ctx.translate(ped.x, ped.y);
      if (ped.state === 'down') {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = ped.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 6, 0, 0, TAU);
        ctx.fill();
      } else {
        ctx.rotate(ped.angle);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 3, 9, 6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = ped.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(6, 0, 4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // The player: on foot a figure with a direction, in a car the car itself.
    const p = state.player;
    if (p.onFoot) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(2, 4, 11, 7, 0, 0, TAU);
      ctx.fill();
      if (p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER.radius, 0, TAU);
      ctx.fill();
      ctx.rotate(p.angle);
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(9, 0, 5, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (p.car) {
      const def = p.car;
      drawCar(def.x, def.y, def.angle, def.color, def.trim, null, { hp: def.hp });
      // Headlight cone at dusk and night.
      if (dayPart === 'dusk' || dayPart === 'night') {
        ctx.save();
        ctx.translate(def.x, def.y);
        ctx.rotate(def.angle);
        const cone = ctx.createLinearGradient(27, 0, 240, 0);
        cone.addColorStop(0, 'rgba(255, 244, 180, 0.28)');
        cone.addColorStop(1, 'rgba(255, 244, 180, 0)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(27, -8);
        ctx.lineTo(240, -70);
        ctx.lineTo(240, 70);
        ctx.lineTo(27, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Bullets.
    ctx.fillStyle = '#ffe082';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, TAU);
      ctx.fill();
    }

    // Particles.
    for (const pt of state.particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (pt.kind === 'smoke' ? (1.6 - a * 0.6) : 1), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Lighting: dusk and night dim the world, with a warm pool around the player.
    const light = LIGHT[dayPart];
    if (light.dark > 0) {
      ctx.fillStyle = `rgba(10, 14, 34, ${light.dark})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const px = p.x - cam.x;
      const py = p.y - cam.y;
      const glow = ctx.createRadialGradient(px, py, 60, px, py, 420);
      glow.addColorStop(0, 'rgba(255, 220, 150, 0.14)');
      glow.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (dayPart === 'dusk') {
      ctx.fillStyle = LIGHT.dusk.sky;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return { draw };
}
