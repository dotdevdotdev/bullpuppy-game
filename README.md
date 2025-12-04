# Bullpuppy Chill Space

A relaxing 3D web experience where bulldog puppies roam around a peaceful meadow. Built with Three.js and Vite.

## Features

- Animated bulldog puppies with idle, walk, and run animations
- Simple wandering AI - puppies pick random destinations and move naturally
- Smooth animation transitions between states
- Orbit camera controls for exploring the scene
- Soft lighting and pleasant atmosphere

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 in your browser.

## Controls

- **Left-click + drag**: Rotate camera
- **Scroll wheel**: Zoom in/out
- **Right-click + drag**: Pan

## Project Structure

```
bullpuppy-game/
├── public/
│   ├── bulldog_puppy.glb       # Rigged base model
│   ├── bulldog_puppy_idle.glb  # Idle animation
│   ├── bulldog_puppy_walk.glb  # Walk animation
│   └── bulldog_puppy_run.glb   # Run animation
├── src/
│   ├── main.js                 # Scene setup, camera, controls
│   ├── environment.js          # Ground, lighting, sky
│   └── puppy.js                # Puppy class with AI and animations
├── index.html
├── package.json
└── vite.config.js
```

## Tech Stack

- [Three.js](https://threejs.org/) - 3D graphics
- [Vite](https://vitejs.dev/) - Build tool and dev server
- GLB models with skeletal animations

## Customization

Adjust puppy behavior in `src/puppy.js`:

```javascript
const BOUNDS = 40;        // Roaming area size
const WALK_SPEED = 1.5;   // Walking speed
const RUN_SPEED = 4;      // Running speed
const IDLE_CHANCE = 0.3;  // Chance to stop and idle
```

Change puppy count in `src/main.js`:

```javascript
const PUPPY_COUNT = 12;
```
