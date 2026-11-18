// Keyboard and pointer input for Velvet Coast. Held keys give movement and
// steering; one-shot presses (confirm, pause, garage, horn, mute, enter a car)
// are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Mouse clicks aim the pistol.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GARAGE = 4;
export const ACTION_HORN = 8;
export const ACTION_MUTE = 16;
export const ACTION_ENTER = 32;
export const ACTION_RESTART = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const GARAGE = new Set(['KeyG']);
const HORN = new Set(['KeyH']);
const MUTE = new Set(['KeyM']);
const ENTER = new Set(['KeyE']);
const RESTART = new Set(['KeyR']);
const HANDBRAKE = new Set(['Space']);

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, sprint: false, handbrake: false };
  let actions = 0;
  const mouse = { x: 0, y: 0, clicked: false };

  function down(event) {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (SPRINT.has(event.code)) held.sprint = true;
    else if (HANDBRAKE.has(event.code)) held.handbrake = true;
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (GARAGE.has(event.code)) { if (!event.repeat) actions |= ACTION_GARAGE; }
    else if (HORN.has(event.code)) { if (!event.repeat) actions |= ACTION_HORN; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (ENTER.has(event.code)) { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART; }
    else return;
    if (event.code !== 'KeyM') event.preventDefault();
  }

  function up(event) {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (SPRINT.has(event.code)) held.sprint = false;
    else if (HANDBRAKE.has(event.code)) held.handbrake = false;
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.sprint = held.handbrake = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  });

  return {
    held,
    mouse,
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** True once for the click since the last call, with its canvas position. */
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was ? { x: mouse.x, y: mouse.y } : null;
    },
  };
}
