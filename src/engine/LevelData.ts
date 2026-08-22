import { FloorConfig, NoteDoc } from '../types';

export const FLOOR_CONFIGS: Record<number, FloorConfig> = {
  1: {
    floorNumber: 1,
    name: "Floor 1: Abandoned Grand Lobby & Hallways",
    subtitle: "Midnight (12:00 AM) — Suspense & Shadows",
    description: "The grand lobby is dead silent. Shadows writhe outside your flashlight beam. Destroy 2 cameras and retrieve the Reception Keycard to open the floor 2 staircase.",
    targetCamerasCount: 2,
    ambientColor: "#334155",
    fogDensity: 0.022,
    fogColor: "#1a2332",
    horrorAtmosphere: "Cold blue gloom. Crouch and hide under counters or inside wardrobes to evade stalkers.",
    unlockRequirementText: "Complete floor tasks to unlock Floor 2 Staircase.",
    objectives: [
      { id: 'cams', text: 'Destroy Security Cameras', completed: false, current: 0, total: 2 },
      { id: 'keycard', text: 'Retrieve Master Keycard (Reception Desk)', completed: false }
    ]
  },
  2: {
    floorNumber: 2,
    name: "Floor 2: Decaying Guest Suites & Armory",
    subtitle: "01:15 AM — Aggressive Lurkers & Weapon Cache",
    description: "Blood-streaked corridors and lurking stalkers. Find the Tactical 9mm Pistol in Room 202 to defend yourself and flip the firewall lever in Room 204.",
    targetCamerasCount: 2,
    ambientColor: "#422822",
    fogDensity: 0.026,
    fogColor: "#291814",
    horrorAtmosphere: "Crimson shadows. Gunshots stun monsters for 10 seconds. Hide in metal lockers.",
    unlockRequirementText: "Complete floor tasks to unlock Floor 3 Staircase.",
    objectives: [
      { id: 'cams', text: 'Destroy Security Cameras', completed: false, current: 0, total: 2 },
      { id: 'pistol', text: 'Retrieve Tactical 9mm Pistol (Room 202)', completed: false },
      { id: 'firewall', text: 'Disarm Magnetic Firewall Switch (Room 204)', completed: false }
    ]
  },
  3: {
    floorNumber: 3,
    name: "Floor 3: The Grand Ballroom & Gothic Library",
    subtitle: "02:30 AM — Armored Horrors (Photophobic)",
    description: "A decaying luxury ballroom and gothic library. Armored horrors freeze when you shine your flashlight directly at them! Play the ballroom piano and gather the library sigil tablets.",
    targetCamerasCount: 3,
    ambientColor: "#263d2e",
    fogDensity: 0.028,
    fogColor: "#16281c",
    horrorAtmosphere: "Sickly green decay. Monsters freeze under flashlight. Hide under piano or in library wardrobes.",
    unlockRequirementText: "Complete floor tasks to unlock Floor 4 Staircase.",
    objectives: [
      { id: 'cams', text: 'Destroy Security Cameras', completed: false, current: 0, total: 3 },
      { id: 'piano', text: 'Play Grand Piano Chord (Ballroom)', completed: false },
      { id: 'sigil', text: 'Collect Ancient Sigil Tablet (Library)', completed: false }
    ]
  },
  4: {
    floorNumber: 4,
    name: "Floor 4: Penthouse Corridors & Occult Laboratory",
    subtitle: "03:45 AM — Supernatural Rifts & Phantoms (Photophobic)",
    description: "A dark, occult nightmare. Phantoms stalk the darkness. Cleanse the blood altar and recover the Penthouse Master Seal to breach the Sanctuary.",
    targetCamerasCount: 3,
    ambientColor: "#2b1022",
    fogDensity: 0.038,
    fogColor: "#160714",
    horrorAtmosphere: "Deep ominous darkness. Creepy purple lamps and glowing runes. Hide under gurneys.",
    unlockRequirementText: "Complete floor tasks to breach the Grand Aurelia Sanctuary.",
    objectives: [
      { id: 'cams', text: 'Destroy Corrupted Ocular Nodes', completed: false, current: 0, total: 3 },
      { id: 'altar', text: 'Cleanse Occult Blood Altar (Laboratory)', completed: false },
      { id: 'seal', text: 'Collect Penthouse Master Seal Key', completed: false }
    ]
  },
  5: {
    floorNumber: 5,
    name: "Floor 5: The Grand Aurelia Sanctuary & Vault Arena",
    subtitle: "05:00 AM — The Warden of Blackridge",
    description: "The ancient Aurelia Heart pulses on the central altar dais. Defeat the nightmare titan, extract the legendary jewel core, and escape through the emergency vault before dawn!",
    targetCamerasCount: 0,
    ambientColor: "#25050f",
    fogDensity: 0.036,
    fogColor: "#140208",
    horrorAtmosphere: "Supernatural pulse. Slay the boss, claim the Aurelia Heart Jewel, and escape!",
    unlockRequirementText: "Defeat the Warden, extract the Aurelia Heart Jewel, and escape!",
    objectives: [
      { id: 'boss', text: 'Defeat the Warden of Blackridge', completed: false },
      { id: 'heart', text: 'Extract the Aurelia Heart Jewel', completed: false },
      { id: 'escape', text: 'Escape through the Emergency Staircase Vault', completed: false }
    ]
  }
};

export const LORE_NOTES: Record<string, NoteDoc> = {
  note_1: {
    id: "note_1",
    title: "Torn Journal Entry - October 1934",
    date: "Oct 12, 1934",
    author: "Hotel Concierge",
    content: "The guests won't stop complaining about the scratching in the ceiling vents. When I looked with a lantern, I swear the shadows pulled themselves into spidery limbs and skittered away. Mr. Vance visited the basement again today carrying that black velvet lockbox. The air turned freezing cold the moment he walked past."
  },
  note_2: {
    id: "note_2",
    title: "Surveillance Memo #104",
    date: "Nov 3, 1934",
    author: "Blackridge Security",
    content: "The automated camera network is tied directly to the hotel's magnetic security bulkheads. If a floor's surveillance feed is severed or destroyed, the emergency lockdown lifts automatically. Warning: Keep cameras functional at all costs. Whatever is crawling inside room 204 does not want to be watched."
  },
  note_3: {
    id: "note_3",
    title: "Occult Appraisal - The Aurelia Heart",
    date: "Aug 19, 1935",
    author: "Professor Harrison Gray",
    content: "The Aurelia Heart is not merely a crimson gemstone of unimaginable monetary wealth. It is a supernatural conduit—a prison for an eldritch consciousness that hungers for mortal souls. Whoever binds the Heart at dawn commands absolute dominion over the shadows... but at the cost of every innocent life in their grasp."
  },
  note_4: {
    id: "note_4",
    title: "Victor Vance's Ransom Recording Note",
    date: "Tonight (11:45 PM)",
    author: "Victor Vance",
    content: "You think I want that jewel for money, protagonist? Fool. The Aurelia Heart will grant me eternal vitality before dawn breaks. Bring it to the hotel entrance before 6:00 AM, or your wife and child will become fuel for the ritual. Midnight has struck. Run, clock's ticking."
  }
};
