// The story: 12 missions over 3 days in Velvet Coast. Rae Solano, a courier driver
// who owes the wrong people money, takes jobs from Marta Voss, a fixer who runs the
// Old Market. Chief Danner's Velvet Coast police are the wall between Rae and a
// clean slate. Each mission is a list of objectives the world checks in order.
//
// Objective types:
//   goto    — reach the marker (on foot or in a car)
//   pickup  — reach the marker and collect the package there
//   deliver — reach the marker before the timer runs out
//   tail    — stay within 150..420 px of the target car for the listed seconds
//   steal   — get into the marked car, then drive it to the marker
//   escape  — drop the wanted level to zero, or reach the hideout marker
//   survive — stay alive with the listed wanted level for the listed seconds

export const STORY = {
  hero: 'Rae Solano',
  fixer: 'Marta Voss',
  chief: 'Chief Danner',
  intro: 'Rae Solano owes $12,000 to the wrong people. Three days. Twelve jobs. One way out of Velvet Coast.',
  dayIntros: [
    'DAY 1 — Small jobs. Learn the streets, earn the trust, stay out of sight.',
    'DAY 2 — The heat is on. Danner knows your name now. Bigger jobs, bigger risks.',
    'DAY 3 — The Vault Run. One last score, then the Sunset Pier. No going back.',
  ],
  win: 'The boat is waiting at Sunset Pier. Rae is free — and Velvet Coast will remember the driver who outran it all.',
};

export const MISSIONS = [
  {
    day: 1, name: 'First Fare', reward: 150,
    brief: 'A passenger is waiting at Palm Court. Drive them to the Old Market before the meter runs out.',
    radio: 'Marta: First job is easy, Rae. Pick them up, drop them off, smile. The city is watching.',
    objectives: [
      { type: 'goto', x: 1010, y: 900, label: 'Pick up the passenger — Palm Court' },
      { type: 'deliver', x: 380, y: 900, label: 'Drop them at Old Market', seconds: 75 },
    ],
  },
  {
    day: 1, name: 'Cold Chain', reward: 200,
    brief: 'A crate of ice-cold cargo for The Cannery. It melts if you are slow — and the clock is running.',
    radio: 'Marta: The Cannery pays on time, Rae. Do not keep them waiting.',
    objectives: [
      { type: 'pickup', x: 1420, y: 620, label: 'Collect the crate — Downtown' },
      { type: 'deliver', x: 2080, y: 380, label: 'Deliver to The Cannery', seconds: 70 },
    ],
  },
  {
    day: 1, name: 'Paper Trail', reward: 220,
    brief: 'Three envelopes hidden around Old Market. On foot — a car draws eyes here. Collect them all.',
    radio: 'Marta: Leave the car, Rae. Walk like you belong. Three envelopes, no hurry, no noise.',
    objectives: [
      { type: 'pickup', x: 340, y: 640, label: 'Envelope 1 of 3 — Market Hall' },
      { type: 'pickup', x: 640, y: 1180, label: 'Envelope 2 of 3 — Flower Court' },
      { type: 'pickup', x: 420, y: 1500, label: 'Envelope 3 of 3 — Tea House' },
    ],
  },
  {
    day: 1, name: 'Hot Wheels', reward: 300,
    brief: 'A Coral GT is parked outside the Strip, keys in it. Take it — and bring it to Benny\'s Garage.',
    radio: 'Benny: That Coral GT is mine now, Rae. Bring her to the garage and I will make her yours.',
    objectives: [
      { type: 'steal', x: 1880, y: 300, label: 'Steal the Coral GT — The Strip', car: 'coral' },
      { type: 'goto', x: 635, y: 355, label: 'Bring it to Benny\'s Garage' },
    ],
  },
  {
    day: 2, name: 'Tail Job', reward: 320,
    brief: 'Follow the grey sedan out of Downtown. Stay close enough to see it, far enough that it never sees you.',
    radio: 'Marta: Eyes on the sedan, Rae. If it spots you, the job is dead. Keep your distance.',
    objectives: [
      { type: 'tail', x: 1300, y: 620, label: 'Tail the grey sedan — do not be spotted', seconds: 25 },
    ],
  },
  {
    day: 2, name: 'Getaway', reward: 350,
    brief: 'Danner\'s units are closing in. Lose them — break line of sight and let the heat die down.',
    radio: 'VCPD dispatch: All units, the Solano car is on the move. Box it in.',
    heat: 3,
    objectives: [
      { type: 'escape', x: 1180, y: 1500, label: 'Lose the cops — reach the Safehouse' },
    ],
  },
  {
    day: 2, name: 'Night Shift', reward: 400,
    brief: 'A dusk delivery across the whole city, from Harbor East to Sunset Pier. The roads are busy — go fast anyway.',
    radio: 'Marta: The pier buyer leaves at midnight, Rae. Dusk is your deadline.',
    objectives: [
      { type: 'pickup', x: 2100, y: 900, label: 'Collect the parcel — Harbor East' },
      { type: 'deliver', x: 420, y: 1690, label: 'Deliver to Sunset Pier', seconds: 85 },
    ],
  },
  {
    day: 2, name: 'The Strip', reward: 450,
    brief: 'The casino vault is open for exactly four minutes. Get in on foot, grab the cash, get out before the alarm.',
    radio: 'Marta: The Sand Dollar vault. In, out, gone. The alarm means four stars, Rae — run.',
    objectives: [
      { type: 'goto', x: 1960, y: 320, label: 'Reach the Sand Dollar casino' },
      { type: 'pickup', x: 1960, y: 320, label: 'Grab the cash — on foot' },
      { type: 'escape', x: 1180, y: 1500, label: 'Escape to the Safehouse', heat: 4 },
    ],
  },
  {
    day: 3, name: 'Harbor Lights', reward: 500,
    brief: 'A midnight drop at the docks. Danner set a trap — the harbour is crawling with units. Deliver anyway.',
    radio: 'VCPD dispatch: Harbour is locked down. Nobody leaves Dock 9 tonight.',
    heat: 3,
    objectives: [
      { type: 'deliver', x: 2180, y: 900, label: 'Deliver to Dock 9 — Harbor East', seconds: 80 },
    ],
  },
  {
    day: 3, name: 'Roadblock Run', reward: 550,
    brief: 'They put roadblocks on every road to the pier. Smash through or slip around — just get there.',
    radio: 'VCPD dispatch: Roadblocks up on all routes to the pier. Box that car in, all units.',
    heat: 4,
    objectives: [
      { type: 'goto', x: 420, y: 1690, label: 'Break through to Sunset Pier' },
    ],
  },
  {
    day: 3, name: 'The Vault Run', reward: 800,
    brief: 'The big one. The Sand Dollar vault, five stars, the whole city chasing you. Take the money and run for the pier.',
    radio: 'Marta: This is it, Rae. The Vault Run. Everything you owe, in one bag. Do not stop.',
    heat: 5,
    objectives: [
      { type: 'pickup', x: 1960, y: 320, label: 'Empty the vault — The Strip' },
      { type: 'deliver', x: 420, y: 1690, label: 'Run for Sunset Pier — 5 stars', seconds: 110 },
    ],
  },
  {
    day: 3, name: 'Sunset Goodbye', reward: 1000,
    brief: 'The boat is waiting. One last drive down the coast road, one last sunset, and Velvet Coast is behind you.',
    radio: 'Marta: The boat leaves at sunset, Rae. No goodbyes — just drive.',
    objectives: [
      { type: 'deliver', x: 420, y: 1690, label: 'Reach the boat — Sunset Pier', seconds: 90 },
    ],
  },
];

/** Radio chatter the HUD shows, picked by wanted level. */
export const RADIO = {
  0: [
    'Coast Radio: smooth traffic on the Strip tonight.',
    'Coast Radio: sunset at 19:40, perfect beach weather.',
    'Marta: Quiet streets, Rae. Keep it that way.',
  ],
  1: [
    'VCPD dispatch: one star, keep an eye out near Downtown.',
    'VCPD dispatch: a car matching the description was seen.',
  ],
  2: [
    'VCPD dispatch: two stars, units moving to intercept.',
    'VCPD dispatch: the suspect is driving fast. Pursue with care.',
  ],
  3: [
    'VCPD dispatch: three stars, roadblocks up — box that car in, all units.',
    'VCPD dispatch: suspect is armed and mobile. Do not let it reach the pier.',
  ],
  4: [
    'VCPD dispatch: four stars, all units converge. This one does not get away.',
    'Chief Danner: I want that car stopped. Now.',
  ],
  5: [
    'VCPD dispatch: five stars. Every unit in the city is on this chase.',
    'Chief Danner: Shut down the coast road. Nobody leaves Velvet Coast tonight.',
  ],
};

/** Garage stock: what money buys between jobs. */
export const GARAGE_STOCK = [
  { id: 'repair', name: 'Full Repair', cost: 100, blurb: 'Patch the body, top up the tank.' },
  { id: 'armor', name: 'Armour Plating', cost: 200, blurb: '+40 car health, forever.' },
  { id: 'engine', name: 'Tuned Engine', cost: 300, blurb: '+12% top speed, forever.' },
  { id: 'handling', name: 'Race Tyres', cost: 250, blurb: 'Sharper steering, better grip.' },
  { id: 'ammo', name: 'Pistol Ammo', cost: 60, blurb: '+12 rounds for the pistol.' },
  { id: 'bribe', name: 'Pay Off Danner', cost: 150, blurb: 'Wanted level drops by 2 stars.' },
];
