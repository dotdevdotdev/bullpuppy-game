# Mission: Bullpuppy Chill Space v1.0

> **Branch**: `feature/bullpuppy-chill-v1.0`
> **PR Target**: `main`
> **Parallel Safe**: Yes (new project)

## Overview
Create a relaxing 3D web experience where bulldog puppies roam around a peaceful environment. Built with Three.js and Vite, the scene features the user's bulldog puppy model wandering autonomously with simple AI, ambient lighting, and orbit camera controls for exploration.

## Goals
- Load and display the bulldog puppy GLB model
- Create a peaceful ground environment with grass-like appearance
- Implement simple wandering AI for multiple puppies
- Add orbit camera controls for user exploration
- Provide ambient lighting and optional skybox for atmosphere

## Dependencies
- None (greenfield project)

## Expected Outcomes
- Working Vite + Three.js project structure
- 3D scene with ground plane and lighting
- Multiple bulldog puppies wandering autonomously
- Smooth camera controls for exploration
- Runs in browser with `npm run dev`

---

## Wave 1: Project Foundation
**Parallel Tasks**: 1 agent
**Depends on**: None

### Task 1.1: Vite + Three.js Setup
**Agent**: Build/Config
**Files**: `package.json`, `vite.config.js`, `index.html`

Initialize Vite project with Three.js dependencies.

```json
{
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

**Acceptance Criteria**:
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts dev server
- [ ] Basic HTML loads in browser

### Task 1.2: Scene Bootstrap
**Agent**: Three.js/Core
**Files**: `src/main.js`

Create basic Three.js scene with:
- Scene, camera, renderer
- Animation loop
- Window resize handling

**Acceptance Criteria**:
- [ ] Black canvas renders full viewport
- [ ] No console errors
- [ ] Resizes with window

---

## Wave 2: Environment
**Parallel Tasks**: 1 agent
**Depends on**: Wave 1

### Task 2.1: Ground Plane
**Agent**: Three.js/Environment
**Files**: `src/environment.js`

Create a large grass-colored ground plane.

```javascript
// Ground with soft green color
const geometry = new THREE.PlaneGeometry(100, 100);
const material = new THREE.MeshStandardMaterial({
  color: 0x7cba5f,
  roughness: 0.8
});
```

**Acceptance Criteria**:
- [ ] Green ground plane visible
- [ ] Ground is flat and horizontal

### Task 2.2: Lighting Setup
**Agent**: Three.js/Environment
**Files**: `src/environment.js`

Add ambient + directional lighting for soft shadows.

```javascript
// Soft ambient light
const ambient = new THREE.AmbientLight(0xffffff, 0.6);

// Sun-like directional light
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 50, 50);
```

**Acceptance Criteria**:
- [ ] Scene is well-lit
- [ ] No harsh shadows
- [ ] Pleasant daytime feel

### Task 2.3: Skybox/Background
**Agent**: Three.js/Environment
**Files**: `src/environment.js`

Add gradient sky background color.

**Acceptance Criteria**:
- [ ] Sky-blue background instead of black
- [ ] Creates outdoor atmosphere

---

## Wave 3: Puppy Loading & Display
**Parallel Tasks**: 1 agent
**Depends on**: Wave 2

### Task 3.1: GLB Model Loader
**Agent**: Three.js/Assets
**Files**: `src/puppy.js`

Load the bulldog_puppy.glb model using GLTFLoader.

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('/bulldog_puppy.glb', (gltf) => {
  const model = gltf.scene;
  // Scale and position as needed
});
```

**Acceptance Criteria**:
- [ ] Model loads without errors
- [ ] Model visible in scene
- [ ] Model properly scaled

### Task 3.2: Multiple Puppies
**Agent**: Three.js/Assets
**Files**: `src/puppy.js`

Clone model to create multiple puppies at random positions.

**Acceptance Criteria**:
- [ ] 5+ puppies visible
- [ ] Puppies at different positions
- [ ] All puppies render correctly

---

## Wave 4: Wandering AI
**Parallel Tasks**: 1 agent
**Depends on**: Wave 3

### Task 4.1: Puppy Wandering Behavior
**Agent**: Gameplay/AI
**Files**: `src/puppy.js`

Implement simple wandering:
- Pick random target point
- Move toward it slowly
- Rotate to face movement direction
- Pick new target when reached

```javascript
class Puppy {
  constructor(model) {
    this.model = model;
    this.target = new THREE.Vector3();
    this.speed = 0.5;
    this.pickNewTarget();
  }

  pickNewTarget() {
    this.target.set(
      (Math.random() - 0.5) * 40,
      0,
      (Math.random() - 0.5) * 40
    );
  }

  update(delta) {
    // Move toward target
    // Rotate to face direction
    // Pick new target when close
  }
}
```

**Acceptance Criteria**:
- [ ] Puppies move around scene
- [ ] Movement is smooth
- [ ] Puppies face movement direction
- [ ] Puppies stay within bounds

---

## Wave 5: Camera Controls
**Parallel Tasks**: 1 agent
**Depends on**: Wave 4

### Task 5.1: Orbit Controls
**Agent**: Three.js/Controls
**Files**: `src/main.js`

Add OrbitControls for user camera interaction.

```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.1; // Prevent going underground
```

**Acceptance Criteria**:
- [ ] Can rotate camera with mouse drag
- [ ] Can zoom with scroll wheel
- [ ] Can pan with right-click drag
- [ ] Camera cannot go below ground

### Human Review Checkpoint 1
- [ ] Puppies wander naturally
- [ ] Environment feels peaceful
- [ ] Controls are intuitive
- [ ] Performance is smooth

---

## Rollback Plan

Simple static site - just delete and start over if needed. No database or persistent state.

## Success Metrics

- Page loads in <3 seconds
- Maintains 60fps with 5+ puppies
- All puppies visible and moving
- No console errors
- Works in Chrome, Firefox, Safari
