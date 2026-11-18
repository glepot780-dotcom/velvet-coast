// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between seven screens: title, play,
// paused, garage, day intro, win and game over. Progress saves to localStorage.
//
// ?seed=N fixes the city and traffic. ?shot=chase|mission|garage|dusk (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { FIELD, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_GARAGE, ACTION_HORN, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer } from './render.js';
import { drawDayIntro, drawGarage, drawHud, drawOver, drawPaused, drawTitle, drawWin } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { CARS } from './config.js';
import { GARAGE_STOCK } from './missions.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave(world) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.serialize()));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

const save = readSave();
const world = createWorld(createRandom(seed), save);
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);
const hasSave = save !== null && save.missionIndex > 0;
let garageSel = 0;
let garageMoveAt = 0;

function announce(message) {
  status.textContent = message;
}

function startFresh() {
  world.reset();
  world.startMission(0);
  world.state.screen = 'play';
  announce('Day 1. Mission 1 of 12: First Fare.');
}

function continueGame() {
  world.startMission(world.state.missionIndex);
  world.state.screen = 'play';
  announce(`Mission ${world.state.missionIndex + 1} of 12.`);
}

function retryMission() {
  const s = world.state;
  s.health = 100;
  s.ammo = 12;
  s.player.x = world.city.spawn.x;
  s.player.y = world.city.spawn.y;
  s.player.onFoot = true;
  s.player.car = null;
  world.police.cars.length = 0;
  world.police.roadblocks.length = 0;
  world.police.wanted = 0;
  world.police.heat = 0;
  world.startMission(s.missionIndex);
  s.screen = 'play';
  announce(`Retrying mission ${s.missionIndex + 1}.`);
}

function runShot(name) {
  const scene = stageShot(name, world);
  const dayPart = world.dayPart();
  let painted = 0;
  function paint() {
    renderer.draw(world, dayPart);
    if (scene.screen === 'garage') drawGarage(canvas.getContext('2d'), world, scene.garageSelection);
    else drawHud(canvas.getContext('2d'), world, dayPart);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = world.state.screen;
  let accumulator = 0;
  let last = performance.now();

  function handleEvents(events) {
    if (events & 2) audio.shot();
    if (events & 4) audio.crash();
    if (events & 1) audio.blip();
    if (events & 512) audio.cash();
    if (events & 16) {
      audio.jingle();
      writeSave(world);
    }
    if (events & 64) {
      audio.jingle();
      writeSave(world);
    }
    if (events & 32) audio.fail();
    if (events & 128) audio.fail();
    if (events & 1024) audio.horn();
  }

  function stepWorld(inputState) {
    const events = world.step(STEP, inputState);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const click = input.takeClick();
    const s = world.state;

    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
    }
    audio.unlock();

    if (s.screen === 'title') {
      if (actions & ACTION_CONFIRM) {
        if (hasSave) continueGame();
        else startFresh();
      }
      while (accumulator >= STEP) {
        stepWorld({ up: false, down: false, left: false, right: false, enter: false, sprint: false, handbrake: false, horn: false, shoot: null });
        accumulator -= STEP;
      }
      renderer.draw(world, world.dayPart());
      drawTitle(canvas.getContext('2d'), world, hasSave, save ? save.stats : null);
      return;
    }

    if (s.screen === 'paused') {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        s.screen = 'play';
        announce('Playing.');
      }
      renderer.draw(world, world.dayPart());
      drawHud(canvas.getContext('2d'), world, world.dayPart());
      drawPaused(canvas.getContext('2d'));
      accumulator = 0;
      return;
    }

    if (s.screen === 'garage') {
      const nowMs = performance.now();
      if (input.held.up && nowMs - garageMoveAt > 180) {
        garageSel = (garageSel - 1 + GARAGE_STOCK.length + CARS.length) % (GARAGE_STOCK.length + CARS.length);
        garageMoveAt = nowMs;
      }
      if (input.held.down && nowMs - garageMoveAt > 180) {
        garageSel = (garageSel + 1) % (GARAGE_STOCK.length + CARS.length);
        garageMoveAt = nowMs;
      }
      if (actions & ACTION_CONFIRM) {
        let ok = false;
        if (garageSel < GARAGE_STOCK.length) ok = world.buyStock(GARAGE_STOCK[garageSel].id);
        else ok = world.buyCar(CARS[garageSel - GARAGE_STOCK.length].id);
        if (ok) {
          audio.cash();
          writeSave(world);
        } else {
          audio.fail();
        }
      }
      if (actions & (ACTION_GARAGE | ACTION_PAUSE)) {
        s.screen = 'play';
        writeSave(world);
      }
      renderer.draw(world, world.dayPart());
      drawGarage(canvas.getContext('2d'), world, garageSel);
      accumulator = 0;
      return;
    }

    if (s.screen === 'day') {
      if (actions & ACTION_CONFIRM) {
        world.startMission(s.pendingMission);
        s.screen = 'play';
        announce(`Day ${s.day}. Mission ${s.missionIndex + 1} of 12.`);
      }
      renderer.draw(world, world.dayPart());
      drawDayIntro(canvas.getContext('2d'), world);
      accumulator = 0;
      return;
    }

    if (s.screen === 'win') {
      if (actions & ACTION_RESTART) startFresh();
      renderer.draw(world, world.dayPart());
      drawWin(canvas.getContext('2d'), world);
      accumulator = 0;
      return;
    }

    if (s.screen === 'over') {
      if (actions & ACTION_RESTART) retryMission();
      renderer.draw(world, world.dayPart());
      drawOver(canvas.getContext('2d'), world);
      accumulator = 0;
      return;
    }

    // Playing.
    if (actions & ACTION_PAUSE) {
      s.screen = 'paused';
      announce('Paused.');
      accumulator = 0;
      return;
    }
    if (actions & ACTION_GARAGE && world.nearGarage()) {
      s.screen = 'garage';
      garageSel = 0;
      announce("Benny's Garage.");
      accumulator = 0;
      return;
    }
    if (actions & ACTION_CONFIRM && !s.mission) {
      world.startMission(s.missionIndex);
      announce(`Mission ${s.missionIndex + 1} of 12: ${s.mission.name}.`);
    }

    while (accumulator >= STEP) {
      const shoot = click && s.player.onFoot
        ? { x: click.x + s.camera.x, y: click.y + s.camera.y }
        : null;
      stepWorld({
        up: input.held.up,
        down: input.held.down,
        left: input.held.left,
        right: input.held.right,
        enter: Boolean(actions & ACTION_ENTER),
        sprint: input.held.sprint,
        handbrake: input.held.handbrake,
        horn: Boolean(actions & ACTION_HORN),
        shoot,
      });
      accumulator -= STEP;
      if (s.screen !== 'play') break;
    }

    // Engine and siren follow the action.
    const speed01 = s.player.car ? Math.abs(s.player.car.speed) / 600 : 0;
    audio.engine(speed01);
    const nearest = world.police.cars.length > 0
      ? Math.min(...world.police.cars.map((c) => Math.hypot(c.x - s.player.x, c.y - s.player.y)))
      : Infinity;
    audio.siren(world.police.wanted > 0, Math.max(0, 1 - nearest / 800));

    renderer.draw(world, world.dayPart());
    drawHud(canvas.getContext('2d'), world, world.dayPart());
  }

  announce('Velvet Coast. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
