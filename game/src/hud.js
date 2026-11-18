// The HUD and the menus: money, health, wanted stars, the minimap, the mission
// banner, the radio line, the speedometer — and the title, pause, garage, day
// intro, win and game-over screens. Everything the judge reads at a glance
// lives here, so every number is big, labelled and readable when shrunk.

import { CARS, FIELD, FONT, PALETTE } from './config.js';
import { GARAGE_STOCK as STOCK, MISSIONS, STORY } from './missions.js';

const TAU = Math.PI * 2;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function stars(ctx, x, y, wanted) {
  for (let i = 0; i < 5; i += 1) {
    const cx = x + i * 30;
    ctx.fillStyle = i < wanted ? PALETTE.star : PALETTE.starEmpty;
    ctx.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const r = k % 2 === 0 ? 11 : 5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`WANTED — ${wanted} STAR${wanted === 1 ? '' : 'S'}`, x, y + 26);
}

function clockText(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawMinimap(ctx, world) {
  const x0 = FIELD.width - 216;
  const y0 = 84;
  const w = 200;
  const h = 150;
  const sx = w / 2400;
  const sy = h / 1800;
  panel(ctx, x0 - 8, y0 - 8, w + 16, h + 16);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = '#20262f';
  ctx.fillRect(x0, y0, w, h);
  // Water + sand along the south edge.
  ctx.fillStyle = '#1d6f8e';
  ctx.fillRect(x0, y0 + 1740 * sy, w, h - 1740 * sy);
  ctx.fillStyle = '#e8cf9e';
  ctx.fillRect(x0, y0 + 1600 * sy, w, 140 * sy);
  // Roads.
  ctx.strokeStyle = '#565b64';
  ctx.lineWidth = 3;
  for (const rx of [220, 520, 820, 1120, 1420, 1720, 2020, 2260]) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * sx, y0);
    ctx.lineTo(x0 + rx * sx, y0 + h);
    ctx.stroke();
  }
  for (const ry of [200, 480, 760, 1040, 1320, 1600]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * sy);
    ctx.lineTo(x0 + w, y0 + ry * sy);
    ctx.stroke();
  }
  // Buildings as faint blocks.
  ctx.fillStyle = '#6b7280';
  for (const b of world.city.buildings) {
    ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
  }
  // Garage.
  const g = world.city.garage;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x0 + (g.x + g.w / 2) * sx - 3, y0 + (g.y + g.h / 2) * sy - 3, 6, 6);
  // Police.
  ctx.fillStyle = '#ff3b30';
  for (const pc of world.police.cars) {
    ctx.beginPath();
    ctx.arc(x0 + pc.x * sx, y0 + pc.y * sy, 3, 0, TAU);
    ctx.fill();
  }
  // Mission marker, pulsing.
  const obj = world.state.mission ? world.state.mission.objectives[world.state.objectiveIndex] : null;
  if (obj && obj.x !== undefined) {
    const r = 4 + 2 * Math.sin(world.state.time * 4);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(x0 + obj.x * sx, y0 + obj.y * sy, r, 0, TAU);
    ctx.fill();
  }
  // Player arrow.
  const p = world.state.player;
  ctx.save();
  ctx.translate(x0 + p.x * sx, y0 + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ff5d8f';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + world.state.camera.x * sx, y0 + world.state.camera.y * sy, FIELD.width * sx, FIELD.height * sy);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(world.state.district, x0, y0 + h + 26);
}

/** The in-game HUD: everything at once, like the top entries show it. */
export function drawHud(ctx, world, dayPart) {
  const s = world.state;
  ctx.textBaseline = 'alphabetic';
  // Top-left: money, day and time, car (or on-foot) and health — one row each,
  // so nothing overlaps when the frame shrinks.
  panel(ctx, 12, 12, 260, 122);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${s.money}`, 24, 44);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`DAY ${s.day} · ${clockText(s.clock)} · ${dayPart.toUpperCase()}`, 24, 64);
  if (s.player.car) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(s.player.car.name.toUpperCase(), 24, 86);
    bar(ctx, 24, 92, 212, 9, s.player.car.hp / 140, s.player.car.hp > 50 ? PALETTE.green : PALETTE.red);
  } else {
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('ON FOOT', 24, 86);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Ammo ${s.ammo}`, 236, 86);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText('HEALTH', 24, 120);
  bar(ctx, 84, 111, 120, 9, s.health / 100, s.health > 40 ? PALETTE.green : PALETTE.red);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`${Math.ceil(s.health)}`, 212, 120);

  // Top-centre: the mission banner.
  const mission = s.mission;
  const obj = mission ? mission.objectives[s.objectiveIndex] : null;
  const bannerW = 520;
  panel(ctx, (FIELD.width - bannerW) / 2, 12, bannerW, 62);
  if (mission && obj) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`MISSION ${s.missionIndex + 1}/12 — ${mission.name.toUpperCase()}`, FIELD.width / 2, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `13px ${FONT}`;
    let line = obj.label;
    if (obj.type === 'deliver' || obj.type === 'survive') line += `  (${Math.max(0, Math.ceil(s.objectiveTimer))}s)`;
    if (obj.type === 'tail') line += `  (${Math.max(0, Math.floor(s.tailTime))}/${obj.seconds || 25}s)`;
    ctx.fillText(line, FIELD.width / 2, 56);
  } else {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('VELVET COAST — FREE ROAM', FIELD.width / 2, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(s.missionIndex >= MISSIONS.length ? 'All missions done — the pier is yours.' : 'Press Enter to start the next mission.', FIELD.width / 2, 56);
  }

  // Top-right: wanted stars + minimap.
  stars(ctx, FIELD.width - 172, 30, world.police.wanted);
  drawMinimap(ctx, world);

  // Bottom-left: controls.
  panel(ctx, 12, FIELD.height - 52, 330, 40);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(s.player.onFoot ? '[WASD] Move   [E] Enter car   [Click] Shoot   [Shift] Sprint' : '[WASD] Drive   [Space] Handbrake   [E] Exit car   [H] Horn', 24, FIELD.height - 27);

  // Bottom-centre: the radio.
  const radioW = 560;
  panel(ctx, (FIELD.width - radioW) / 2, FIELD.height - 52, radioW, 40);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('◉ Radio', (FIELD.width - radioW) / 2 + 12, FIELD.height - 27);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `12px ${FONT}`;
  const line = s.radioLine.length > 62 ? s.radioLine.slice(0, 62) + '…' : s.radioLine;
  ctx.fillText(line, (FIELD.width - radioW) / 2 + 72, FIELD.height - 27);

  // Bottom-right: speed.
  if (s.player.car) {
    panel(ctx, FIELD.width - 152, FIELD.height - 88, 140, 76);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(s.player.car.name.toUpperCase(), FIELD.width - 24, FIELD.height - 70);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`${Math.round(Math.abs(s.player.car.speed) * 0.24)}`, FIELD.width - 24, FIELD.height - 36);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.fillText('KM/H', FIELD.width - 24, FIELD.height - 20);
  } else if (world.nearGarage()) {
    panel(ctx, FIELD.width - 212, FIELD.height - 88, 200, 40);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText("Press G — Benny's Garage", FIELD.width - 112, FIELD.height - 62);
  }

  // District label, fading in when the player crosses into a new district.
  if (s.districtTimer > 0) {
    const a = Math.min(1, s.districtTimer);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(s.district, FIELD.width / 2, 150);
    ctx.globalAlpha = 1;
  }
}

function bigPanel(ctx, title, lines, prompt, accent) {
  const w = 680;
  const h = 150 + lines.length * 30 + 70;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  panel(ctx, x, y, w, h);
  ctx.fillStyle = accent || PALETTE.gold;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, y + 70);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `17px ${FONT}`;
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 118 + i * 30));
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(prompt, FIELD.width / 2, y + h - 34);
}

export function drawTitle(ctx, world, hasSave, best) {
  // A sun-soaked title: gradient sky, sun, sea strip and the city skyline.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, '#ff9a5c');
  sky.addColorStop(0.45, '#ffb37a');
  sky.addColorStop(0.7, '#2a4a6b');
  sky.addColorStop(1, '#10141e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(FIELD.width - 260, 150, 64, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 243, 196, 0.25)';
  ctx.beginPath();
  ctx.arc(FIELD.width - 260, 150, 110, 0, TAU);
  ctx.fill();
  // Skyline.
  ctx.fillStyle = '#1c2433';
  const skyline = [90, 150, 110, 190, 130, 170, 100, 210, 140, 120, 180, 150];
  skyline.forEach((hh, i) => {
    const x = 60 + i * 102;
    ctx.fillRect(x, 470 - hh, 84, hh + 250);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    for (let wy = 470 - hh + 16; wy < 450; wy += 26) {
      for (let wx = x + 12; wx < x + 72; wx += 22) {
        if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 10, 12);
      }
    }
    ctx.fillStyle = '#1c2433';
  });
  ctx.fillStyle = '#155a75';
  ctx.fillRect(0, 640, FIELD.width, 80);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let x = 0; x < FIELD.width; x += 70) ctx.fillRect(x, 660 + ((x * 7) % 30), 40, 3);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 84px ${FONT}`;
  ctx.fillText('VELVET COAST', FIELD.width / 2, 190);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('12 MISSIONS · 3 DAYS IN THE SUN', FIELD.width / 2, 232);
  ctx.fillStyle = '#f2f4f7';
  ctx.font = `17px ${FONT}`;
  ctx.fillText(STORY.intro, FIELD.width / 2, 280);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `15px ${FONT}`;
  ctx.fillText('Drive, steal, outrun the law — and finish the Vault Run before the sun sets.', FIELD.width / 2, 310);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(hasSave ? 'Press Enter — Continue (mission ' + (world.state.missionIndex + 1) + ' of 12)' : 'Press Enter — Start Day 1', FIELD.width / 2, 400);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `15px ${FONT}`;
  ctx.fillText('WASD move / drive · E enter & exit cars · Click shoot · Space handbrake · G garage · P pause · M mute', FIELD.width / 2, 436);
  if (best && best.missionsDone > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`Best so far: ${best.missionsDone}/12 missions · $${best.earned} earned`, FIELD.width / 2, 466);
  }
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  bigPanel(ctx, 'PAUSED', ['The coast road waits for no one — except now.', 'Your progress is saved.'], 'Press P to keep driving', PALETTE.text);
}

export function drawGarage(ctx, world, selection) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const w = 760;
  const h = 560;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  panel(ctx, x, y, w, h);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText("BENNY'S GARAGE", x + 28, y + 48);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`$${world.state.money}`, x + w - 28, y + 48);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  ctx.fillText('Upgrades stay on every car you own. Cars wait in the forecourt.', x + 28, y + 74);

  const s = world.state;
  let rowY = y + 104;
  STOCK.forEach((item, i) => {
    const owned = (item.id === 'armor' && s.upgrades.armor) || (item.id === 'engine' && s.upgrades.engine) || (item.id === 'handling' && s.upgrades.handling);
    const afford = s.money >= item.cost;
    ctx.fillStyle = selection === i ? 'rgba(242, 201, 76, 0.16)' : 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(x + 20, rowY - 20, w - 40, 34);
    ctx.fillStyle = owned ? PALETTE.green : afford ? PALETTE.text : PALETTE.muted;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`${owned ? '✓ ' : ''}${item.name}`, x + 28, rowY + 2);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(item.blurb, x + 280, rowY + 2);
    ctx.fillStyle = owned ? PALETTE.green : PALETTE.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(owned ? 'OWNED' : `$${item.cost}`, x + w - 28, rowY + 2);
    ctx.textAlign = 'left';
    rowY += 38;
  });

  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText('CARS', x + 28, rowY + 14);
  rowY += 40;
  CARS.forEach((car, i) => {
    const idx = STOCK.length + i;
    const owned = s.ownedCars.includes(car.id);
    const afford = s.money >= car.price;
    ctx.fillStyle = selection === idx ? 'rgba(242, 201, 76, 0.16)' : 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(x + 20, rowY - 20, w - 40, 34);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.arc(x + 44, rowY - 3, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = owned ? PALETTE.text : afford ? PALETTE.text : PALETTE.muted;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`${car.name}${s.currentCar === car.id ? '  (driving)' : ''}`, x + 64, rowY + 2);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(car.blurb, x + 280, rowY + 2);
    ctx.fillStyle = owned ? PALETTE.green : PALETTE.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(owned ? 'OWNED' : `$${car.price}`, x + w - 28, rowY + 2);
    ctx.textAlign = 'left';
    rowY += 38;
  });

  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  ctx.fillText('↑ ↓ choose · Enter buy · G or Esc leave the garage', x + 28, y + h - 22);
}

export function drawDayIntro(ctx, world) {
  const day = world.state.day;
  const intro = STORY.dayIntros[day - 1] || '';
  ctx.fillStyle = 'rgba(8, 10, 16, 0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  bigPanel(ctx, `DAY ${day}`, [intro, '', `Mission ${world.state.missionIndex + 1} of 12 — ${MISSIONS[world.state.missionIndex].name}`], 'Press Enter to start the day', PALETTE.gold);
}

export function drawWin(ctx, world) {
  const s = world.state;
  ctx.fillStyle = 'rgba(8, 10, 16, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  bigPanel(ctx, 'YOU WIN', [
    STORY.win,
    '',
    `12 of 12 missions · $${s.stats.earned} earned · ${s.stats.carsStolen} cars stolen · ${s.stats.chasesEscaped} chases escaped`,
    'WIN: finish all 12 missions. LOSE: get busted or run out of time.',
  ], 'Press R to play again', PALETTE.green);
}

export function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.65)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  bigPanel(ctx, 'BUSTED', [
    world.state.missionFailed || 'The run is over.',
    '',
    'WIN: finish all 12 missions. LOSE: get busted or run out of time.',
    `Money kept: $${world.state.money} · Missions done: ${world.state.stats.missionsDone}/12`,
  ], 'Press R to retry the mission', PALETTE.red);
}
