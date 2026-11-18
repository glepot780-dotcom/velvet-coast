// Velvet Coast — every tuning number, colour and car in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. The city itself is bigger
// (2400x1800) and the camera follows the player around it.

export const FIELD = { width: 1280, height: 720 };

/** The city the camera moves through: roads, blocks, beach and harbour. */
export const WORLD = { width: 2400, height: 1800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Where a save is kept between visits (this browser only). */
export const SAVE_KEY = 'velvet-coast.save.v1';

export const PLAYER = {
  radius: 13,
  walkSpeed: 235,
  hp: 100,
  punchRange: 40,
  punchDamage: 30,
  pistolDamage: 34,
  pistolAmmo: 12,
  pistolRange: 420,
  pistolCooldown: 0.22,
};

export const CAR = {
  length: 54,
  width: 28,
  accel: 430,
  brake: 780,
  reverse: 230,
  turn: 2.7,
  grip: 3.4,
  drag: 0.55,
  hp: 100,
  ramDamage: 14,
};

/** The cars the player can own. `top` is top speed in px/s; `price` is garage price. */
export const CARS = [
  { id: 'vela', name: 'Vela Coupe', color: '#e8b64c', trim: '#2b2b33', top: 480, accel: 1.0, price: 0, blurb: 'Your first ride. Quick, light, honest.' },
  { id: 'coral', name: 'Coral GT', color: '#e5534b', trim: '#1f1f26', top: 545, accel: 1.18, price: 600, blurb: 'A harbour racer with a temper.' },
  { id: 'phantom', name: 'Sunset Phantom', color: '#7c5cff', trim: '#14141c', top: 615, accel: 1.32, price: 1200, blurb: 'The fastest thing on Velvet Coast.' },
  { id: 'cab', name: 'Coast Cab', color: '#f2c94c', trim: '#22222a', top: 430, accel: 0.9, price: 350, blurb: 'Nobody looks twice at a cab.' },
];

export const TRAFFIC_COLORS = ['#4fc3f7', '#f2c94c', '#9ccc65', '#e5534b', '#ba68c8', '#eceff1', '#ff8a65', '#4db6ac'];
export const PED_COLORS = ['#ffcc80', '#a5d6a7', '#90caf9', '#f48fb1', '#fff59d', '#ce93d8', '#bcaaa4', '#ef9a9a'];

export const WANTED = {
  /** Seconds with no crime and no police in sight before one star fades. */
  decaySeconds: 18,
  /** How far police can spot the player. */
  sight: 430,
  /** Police cars per star, capped. */
  perStar: 1,
  maxCars: 5,
};

export const ECONOMY = {
  startMoney: 120,
  bribeCost: 150,
  armorCost: 200,
  engineCost: 300,
  handlingCost: 250,
  repairCost: 100,
  ammoCost: 60,
};

export const DAY = {
  /** Game-minutes that pass per real second while playing. */
  minutesPerSecond: 0.55,
  /** Clock starts at 08:00 on day 1. */
  startClock: 8 * 60,
};

/** The four day-parts the lighting uses: morning, afternoon, dusk, night. */
export const LIGHT = {
  morning: { sky: 'rgba(255, 214, 140, 0.05)', tint: '#ffd68c', dark: 0 },
  afternoon: { sky: 'rgba(255, 236, 180, 0.04)', tint: '#ffecb4', dark: 0 },
  dusk: { sky: 'rgba(255, 122, 61, 0.12)', tint: '#ff7a3d', dark: 0.12 },
  night: { sky: 'rgba(24, 32, 86, 0.34)', tint: '#4d6fff', dark: 0.42 },
};

export const PALETTE = {
  backdrop: '#0d1526',
  sand: '#e8cf9e',
  sandDark: '#d9bd85',
  water: '#1d6f8e',
  waterDeep: '#155a75',
  grass: '#7fae62',
  grassDark: '#6d9c53',
  road: '#33373f',
  roadEdge: '#4a4f58',
  lane: '#e8d44d',
  sidewalk: '#9aa0a8',
  buildingRoof: '#5b4a68',
  panel: 'rgba(16, 20, 30, 0.82)',
  panelEdge: 'rgba(255, 255, 255, 0.14)',
  text: '#f2f4f7',
  muted: '#a7adb8',
  gold: '#f2c94c',
  green: '#7ed491',
  red: '#ff6b5e',
  blue: '#5ea8ff',
  star: '#ffd94d',
  starEmpty: '#5a6068',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** District names the city is split into (also the location labels on screen). */
export const DISTRICTS = [
  { name: 'THE STRIP', x: 0, y: 0, w: 2400, h: 200 },
  { name: 'CORAL HEIGHTS', x: 0, y: 200, w: 800, h: 480 },
  { name: 'DOWNTOWN', x: 800, y: 200, w: 800, h: 560 },
  { name: 'THE CANNERY', x: 1600, y: 200, w: 800, h: 560 },
  { name: 'OLD MARKET', x: 0, y: 680, w: 800, h: 640 },
  { name: 'PALM COURT', x: 800, y: 760, w: 800, h: 560 },
  { name: 'HARBOR EAST', x: 1600, y: 760, w: 800, h: 560 },
  { name: 'SUNSET PIER', x: 0, y: 1320, w: 2400, h: 480 },
];
