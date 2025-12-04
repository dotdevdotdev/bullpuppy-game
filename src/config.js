// World settings
export const BOUNDS = 50;
export const MIN_DISTANCE = 0.5;

// Speed settings
export const SPEEDS = {
  PUPPY_WALK: 1.2,
  PUPPY_RUN: 3,
  DOG_WALK: 1.5,
  DOG_RUN: 4,
  PARENT_WALK: 1.0,
  PARENT_RUN: 3,
};

// Age settings (in seconds)
export const AGE = {
  YEAR_DURATION: 120, // 2 minutes = 1 year
  MATURITY_AGE: 6,    // Age when puppies become dogs
};

// Scale modifiers by type
export const SCALES = {
  BOY_PUPPY: 0.7,
  GIRL_PUPPY: 0.6,
  BOY_DOG: 1.0,
  GIRL_DOG: 0.9,
  DADDY: 1.5,
  MOMMY: 1.4,
};

// Color tints (HSL adjustments)
// [hue shift, saturation multiplier, lightness addition]
export const COLOR_TINTS = {
  BOY_PUPPY: { hue: 0.05, saturation: 1.1, lightness: 0.1 },   // Slightly oranger
  GIRL_PUPPY: { hue: 0, saturation: 0.9, lightness: 0.15 },    // Lighter/whiter
  BOY_DOG: { hue: 0.03, saturation: 1.05, lightness: 0.05 },   // Subtle orange
  GIRL_DOG: { hue: 0, saturation: 0.85, lightness: 0.12 },     // Lighter
  DADDY: { hue: 0, saturation: 1.0, lightness: 0 },            // Normal
  MOMMY: { hue: 0, saturation: 0.8, lightness: 0.1 },          // Lighter/whiter
};

// Behavior settings
export const BEHAVIOR = {
  IDLE_CHANCE: 0.3,
  JUMP_CHANCE: 0.1,
  FOLLOW_DISTANCE: 8,
  FAMILY_FOLLOW_DISTANCE: 12,
  COLLISION_DISTANCE: 1.5,
  AVOIDANCE_STRENGTH: 2,
};

// Courtship settings
export const COURTSHIP = {
  DETECT_DISTANCE: 8,      // Distance to notice potential mate
  START_DISTANCE: 3,       // Distance to start courtship
  DURATION: 30,            // Seconds of courtship dance
  JUMP_INTERVAL: 2,        // Jump every N seconds during courtship
  CIRCLE_SPEED: 1.5,       // Speed of circling
};

// Family settings
export const FAMILY = {
  COHESION_STRENGTH: 0.5,  // How strongly family members stick together
  MAX_SPREAD: 10,          // Max distance before family pulls together
  CHILDREN_FOLLOW_PARENTS: true,
};

// Life stages
export const LIFE_STAGE = {
  PUPPY: 'puppy',
  DOG: 'dog',
  PARENT: 'parent',
};

// Gender
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
};
