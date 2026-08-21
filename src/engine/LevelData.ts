import { FloorConfig, NoteDoc } from '../types';

export const FLOOR_CONFIGS: Record<number, FloorConfig> = {
  1: {
    floorNumber: 1,
    name: "Floor 1: Abandoned Grand Lobby & Hallways",
    subtitle: "Midnight (12:00 AM) — Suspense & Shadows",
    description: "The reception is dead silent. Distant skittering echoes along the high ceilings. Destroy the 4 security cameras to disable the staircase lockdown.",
    targetCamerasCount: 4,
    ambientColor: "#111822",
    fogDensity: 0.055,
    fogColor: "#080d14",
    horrorAtmosphere: "Cold blue gloom. Shadows writhe just outside your flashlight beam.",
    unlockRequirementText: "Destroy 4 Security Cameras to unlock Floor 2 Staircase."
  },
  2: {
    floorNumber: 2,
    name: "Floor 2: Decaying Guest Suites",
    subtitle: "01:15 AM — Aggressive Lurkers",
    description: "Peeling wallpaper and blood-streaked doors. Fast, hostile stalkers hunt in the narrow corridors. Search rooms for weapons and destroy all 4 cameras.",
    targetCamerasCount: 4,
    ambientColor: "#221310",
    fogDensity: 0.065,
    fogColor: "#150a08",
    horrorAtmosphere: "Crimson shadows. Stalkers will sprint toward your light.",
    unlockRequirementText: "Destroy 4 Security Cameras to unlock Floor 3 Staircase."
  },
  3: {
    floorNumber: 3,
    name: "Floor 3: The Grand Ballroom & Lounge",
    subtitle: "02:30 AM — Armored Horrors",
    description: "A decaying luxury ballroom with shattered chandeliers. Heavy armored brutes roam the wide halls. Destroy all 5 cameras to access the upper penthouse.",
    targetCamerasCount: 5,
    ambientColor: "#101e15",
    fogDensity: 0.075,
    fogColor: "#09140c",
    horrorAtmosphere: "Sickly green decay. Heavy footsteps rattle the floorboards.",
    unlockRequirementText: "Destroy 5 Security Cameras to unlock Floor 4 Staircase."
  },
  4: {
    floorNumber: 4,
    name: "Floor 4: Penthouse Corridors & Reality Rift",
    subtitle: "03:45 AM — Supernatural Rifts & Phantoms",
    description: "Reality is breaking down. Occult runes glow on the walls, and phantoms phase through doors. Destroy 5 corrupted security cameras to breach the Grand Vault.",
    targetCamerasCount: 5,
    ambientColor: "#200d18",
    fogDensity: 0.085,
    fogColor: "#160710",
    horrorAtmosphere: "Blood red void. Reality flickers and screams echo from the walls.",
    unlockRequirementText: "Destroy 5 Corrupted Cameras to breach the Ritual Chamber."
  },
  5: {
    floorNumber: 5,
    name: "Floor 5: The Grand Vault & Aurelia Altar",
    subtitle: "05:00 AM — The Warden of Blackridge",
    description: "The ancient Aurelia Heart pulses on the altar. Defeat the nightmare entity guarding it, claim the jewel, and escape before sunrise!",
    targetCamerasCount: 0,
    ambientColor: "#25050e",
    fogDensity: 0.07,
    fogColor: "#1c040b",
    horrorAtmosphere: "Supernatural pulse. The Aurelia Heart screams for sacrifice.",
    unlockRequirementText: "Defeat the Warden and retrieve the Aurelia Heart!"
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
