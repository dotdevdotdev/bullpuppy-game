# Mission: God Game Controls v1.1

> **Branch**: `feature/god-controls-v1.1`
> **PR Target**: `main`
> **Parallel Safe**: Yes

## Overview
Add god game style controls allowing players to interact with dogs by picking them up, flinging them, spawning new dogs via toolbar, viewing dog properties, and "becoming" a dog with third-person WASD controls.

## Goals
- Players can pick up any dog by clicking and dragging
- Fling dogs by releasing while dragging (velocity based on drag motion)
- Spawn toolbar lets players add any dog type (6 buttons for each gender/life stage)
- Visual feedback with hand cursor on hover
- Click (without drag) shows dog properties panel
- "Become Dog" action switches to third-person camera with WASD/space/shift controls

## Dependencies
- None (builds on existing dog system)

## Expected Outcomes
- New `src/ui.js` for toolbar and status panel rendering
- New `src/interaction.js` for pick/fling mechanics
- New `src/dogController.js` for third-person dog control
- Updated `dogManager.js` with spawn-on-demand methods
- CSS for toolbar, status panel, and cursor styles

---

## Wave 1: Interaction System
**Parallel Tasks**: 1 agent
**Depends on**: None

### Task 1.1: Dog Picking and Flinging
**Agent**: JavaScript/Three.js
**Files**: `src/interaction.js`, `src/dog.js`, `src/dogManager.js`

Create an interaction system that allows picking up and flinging dogs:

```javascript
// src/interaction.js
export class InteractionManager {
  constructor(scene, camera, renderer, dogManager) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.dogManager = dogManager;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Picking state
    this.hoveredDog = null;
    this.pickedDog = null;
    this.pickOffset = new THREE.Vector3();
    this.liftHeight = 3; // How high dogs float when picked

    // Fling velocity tracking
    this.dragHistory = []; // Last N positions for velocity calc
    this.maxDragHistory = 5;

    this.setupEventListeners();
  }

  setupEventListeners() {
    renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  getDogUnderCursor() {
    // Raycast against all dog meshes
    // Return the dog instance if hit, null otherwise
  }

  onMouseMove(event) {
    // Update mouse coords
    // Update hovered dog (for cursor)
    // If picking, move dog to cursor position + liftHeight
    // Record position for velocity calculation
  }

  onMouseDown(event) {
    // Record click start position and time
    this.clickStartPos = { x: event.clientX, y: event.clientY };
    this.clickStartTime = Date.now();

    // If hovering a dog, prepare to pick it up
    // Don't actually pick up yet - wait for drag threshold
    this.pendingPickDog = this.hoveredDog;
  }

  onMouseUp(event) {
    const dragDistance = Math.hypot(
      event.clientX - this.clickStartPos.x,
      event.clientY - this.clickStartPos.y
    );
    const clickDuration = Date.now() - this.clickStartTime;

    // If minimal movement and short duration = click (select dog)
    if (dragDistance < 5 && clickDuration < 300 && this.pendingPickDog) {
      this.selectDog(this.pendingPickDog);
      this.pendingPickDog = null;
      return;
    }

    // If holding a dog (was dragging):
    // Calculate fling velocity from drag history
    // Apply velocity to dog
    // Set dog.isPicked = false
    // Set dog.velocity for physics
  }

  selectDog(dog) {
    this.selectedDog = dog;
    // Emit event or callback to show status panel
    if (this.onDogSelected) {
      this.onDogSelected(dog);
    }
  }

  deselectDog() {
    this.selectedDog = null;
    if (this.onDogDeselected) {
      this.onDogDeselected();
    }
  }

  update(delta) {
    // Update cursor style based on hover
    // Update picked dog position
    // Apply physics to flung dogs (gravity, ground collision)
  }
}
```

Add to Dog class:
```javascript
// In dog.js - add these properties/methods
this.isPicked = false;
this.velocity = new THREE.Vector3();
this.isFlying = false; // True while in fling arc

updatePhysics(delta) {
  if (this.isFlying) {
    // Apply gravity
    this.velocity.y -= 20 * delta;

    // Move
    this.model.position.add(this.velocity.clone().multiplyScalar(delta));

    // Ground collision
    if (this.model.position.y <= this.yOffset) {
      this.model.position.y = this.yOffset;
      this.velocity.set(0, 0, 0);
      this.isFlying = false;
      // Maybe bounce or play landing animation
    }

    // Bounds
    this.clampToBounds();
  }
}
```

**Acceptance Criteria**:
- [ ] Cursor changes to `grab` when hovering a dog
- [ ] Cursor changes to `grabbing` while dragging
- [ ] Dogs lift off ground when picked (y = liftHeight)
- [ ] Dogs follow cursor smoothly while held
- [ ] Dogs fly in arc when released based on drag velocity
- [ ] Dogs land and resume normal behavior
- [ ] Picked dogs don't run their AI update

### Human Review Checkpoint 1
- [ ] Test pick/fling feels responsive
- [ ] Verify dogs don't clip through ground
- [ ] Check fling velocity feels natural

---

## Wave 2: Spawn Toolbar
**Parallel Tasks**: 1 agent
**Depends on**: Wave 1

### Task 2.1: UI Toolbar
**Agent**: HTML/CSS/JavaScript
**Files**: `src/ui.js`, `src/styles.css`, `index.html`

Create a toolbar with 6 spawn buttons:

```javascript
// src/ui.js
import { LIFE_STAGE, GENDER } from './config.js';

export class UI {
  constructor(dogManager) {
    this.dogManager = dogManager;
    this.createToolbar();
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'spawn-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-title">Spawn Dogs</div>
      <div class="toolbar-buttons">
        <button data-stage="puppy" data-gender="male" title="Boy Puppy">
          <span class="icon">🐕</span>
          <span class="label">Boy Puppy</span>
        </button>
        <button data-stage="puppy" data-gender="female" title="Girl Puppy">
          <span class="icon">🐕</span>
          <span class="label">Girl Puppy</span>
        </button>
        <button data-stage="dog" data-gender="male" title="Boy Dog">
          <span class="icon">🐕</span>
          <span class="label">Boy Dog</span>
        </button>
        <button data-stage="dog" data-gender="female" title="Girl Dog">
          <span class="icon">🐕</span>
          <span class="label">Girl Dog</span>
        </button>
        <button data-stage="parent" data-gender="male" title="Daddy">
          <span class="icon">🐕</span>
          <span class="label">Daddy</span>
        </button>
        <button data-stage="parent" data-gender="female" title="Mommy">
          <span class="icon">🐕</span>
          <span class="label">Mommy</span>
        </button>
      </div>
    `;
    document.body.appendChild(toolbar);

    this.setupButtonListeners();
  }

  setupButtonListeners() {
    const buttons = document.querySelectorAll('#spawn-toolbar button');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const stage = btn.dataset.stage;
        const gender = btn.dataset.gender;
        this.spawnDog(stage, gender);
      });
    });
  }

  spawnDog(stage, gender) {
    // Spawn at random position or center of view
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      5, // Drop from above
      (Math.random() - 0.5) * 10
    );

    this.dogManager.createDog({
      gender: gender === 'male' ? GENDER.MALE : GENDER.FEMALE,
      lifeStage: stage,
      age: stage === 'puppy' ? 0 : (stage === 'dog' ? 6 : 8),
      position: position,
    });

    // New dog starts flying (falling)
    // dogManager.createDog should set isFlying = true when y > yOffset
  }
}
```

CSS styling:
```css
/* src/styles.css or in index.html */
#spawn-toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 100;
  font-family: system-ui, sans-serif;
}

.toolbar-title {
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.toolbar-buttons {
  display: flex;
  gap: 8px;
}

#spawn-toolbar button {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

#spawn-toolbar button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

#spawn-toolbar button .icon {
  font-size: 24px;
}

#spawn-toolbar button .label {
  color: white;
  font-size: 11px;
}

/* Gender color hints */
#spawn-toolbar button[data-gender="male"] {
  border-color: rgba(100, 149, 237, 0.5);
}

#spawn-toolbar button[data-gender="female"] {
  border-color: rgba(255, 182, 193, 0.5);
}

/* Cursor styles */
canvas {
  cursor: default;
}

canvas.hovering-dog {
  cursor: grab;
}

canvas.dragging-dog {
  cursor: grabbing;
}
```

**Acceptance Criteria**:
- [ ] Toolbar displays centered at top of screen
- [ ] 6 buttons visible (2 puppy, 2 dog, 2 parent)
- [ ] Buttons have hover effects
- [ ] Clicking spawns correct dog type
- [ ] New dogs fall from spawn height
- [ ] Male/female buttons have color-coded borders

### Task 2.2: Integrate Systems
**Agent**: JavaScript
**Files**: `src/main.js`

Wire up the interaction manager and UI:

```javascript
// In main.js
import { InteractionManager } from './interaction.js';
import { UI } from './ui.js';

// After dogManager creation:
const interactionManager = new InteractionManager(scene, camera, renderer, dogManager);
const ui = new UI(dogManager);

// In animate loop:
function animate() {
  // ...
  interactionManager.update(delta);
  dogManager.update(delta);
  // ...
}
```

**Acceptance Criteria**:
- [ ] InteractionManager updates each frame
- [ ] UI is created on load
- [ ] All systems work together without errors

### Task 2.3: Dog Status Panel
**Agent**: HTML/CSS/JavaScript
**Files**: `src/ui.js`, `src/styles.css`

Create a status panel that appears when a dog is selected (clicked):

```javascript
// Add to UI class in src/ui.js

createStatusPanel() {
  const panel = document.createElement('div');
  panel.id = 'dog-status-panel';
  panel.className = 'hidden';
  panel.innerHTML = `
    <div class="panel-header">
      <span class="dog-name"></span>
      <button class="close-btn">&times;</button>
    </div>
    <div class="panel-stats">
      <div class="stat-row">
        <span class="stat-label">Type</span>
        <span class="stat-value type-value"></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Gender</span>
        <span class="stat-value gender-value"></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Age</span>
        <span class="stat-value age-value"></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Life Duration</span>
        <span class="stat-value life-duration-value"></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">State</span>
        <span class="stat-value state-value"></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Family</span>
        <span class="stat-value family-value"></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Mate</span>
        <span class="stat-value mate-value"></span>
      </div>
    </div>
    <div class="panel-actions">
      <button class="action-btn become-dog-btn">
        <span class="action-icon">🎮</span>
        <span class="action-label">Become Dog</span>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // Close button
  panel.querySelector('.close-btn').addEventListener('click', () => {
    this.hideStatusPanel();
  });

  // Become dog button
  panel.querySelector('.become-dog-btn').addEventListener('click', () => {
    if (this.selectedDog && this.onBecomeDog) {
      this.onBecomeDog(this.selectedDog);
    }
  });

  this.statusPanel = panel;
}

showStatusPanel(dog) {
  this.selectedDog = dog;
  const panel = this.statusPanel;

  // Update values
  panel.querySelector('.dog-name').textContent = dog.getDisplayName();
  panel.querySelector('.type-value').textContent = dog.getTypeKey().replace('_', ' ');
  panel.querySelector('.gender-value').textContent = dog.gender;
  panel.querySelector('.age-value').textContent = `${dog.ageYears} years`;
  panel.querySelector('.life-duration-value').textContent = this.formatLifeDuration(dog);
  panel.querySelector('.state-value').textContent = dog.state;
  panel.querySelector('.family-value').textContent = dog.family ? `Family #${dog.family.id}` : 'None';
  panel.querySelector('.mate-value').textContent = dog.mate ? dog.mate.getDisplayName() : 'None';

  panel.classList.remove('hidden');
}

hideStatusPanel() {
  this.statusPanel.classList.add('hidden');
  this.selectedDog = null;
}

formatLifeDuration(dog) {
  // Total seconds alive
  const totalSeconds = (dog.ageYears * 120) + dog.ageTimer;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}m ${secs}s`;
}

// Call this in update loop to keep stats fresh
updateStatusPanel() {
  if (this.selectedDog && !this.statusPanel.classList.contains('hidden')) {
    this.showStatusPanel(this.selectedDog);
  }
}
```

CSS for status panel:
```css
#dog-status-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 280px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 12px;
  padding: 16px;
  z-index: 100;
  font-family: system-ui, sans-serif;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

#dog-status-panel.hidden {
  display: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.dog-name {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: white;
}

.panel-stats {
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.stat-value {
  font-size: 13px;
  font-weight: 500;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  background: rgba(100, 149, 237, 0.3);
  border: 2px solid rgba(100, 149, 237, 0.6);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(100, 149, 237, 0.5);
  border-color: rgba(100, 149, 237, 0.9);
}

.action-icon {
  font-size: 18px;
}

.action-label {
  color: white;
  font-size: 14px;
  font-weight: 500;
}
```

**Acceptance Criteria**:
- [ ] Panel appears on left side when dog is clicked
- [ ] Shows dog name, type, gender, age, life duration
- [ ] Shows family and mate info
- [ ] Close button hides panel
- [ ] "Become Dog" button is visible
- [ ] Stats update in real-time while panel is open

### Human Review Checkpoint 2
- [ ] Full flow works: spawn, pick, fling
- [ ] Click vs drag detection works reliably
- [ ] Status panel displays correct info
- [ ] UI doesn't obstruct gameplay
- [ ] Performance is acceptable with many dogs

---

## Wave 3: Third-Person Dog Control
**Parallel Tasks**: 1 agent
**Depends on**: Wave 2

### Task 3.1: Dog Controller System
**Agent**: JavaScript/Three.js
**Files**: `src/dogController.js`, `src/main.js`

Create a controller that lets the player "become" a dog with WASD controls:

```javascript
// src/dogController.js
import * as THREE from 'three';

export class DogController {
  constructor(camera, orbitControls) {
    this.camera = camera;
    this.orbitControls = orbitControls; // To disable during dog mode

    this.controlledDog = null;
    this.isActive = false;

    // Camera settings
    this.cameraOffset = new THREE.Vector3(0, 4, 8); // Behind and above
    this.cameraLookOffset = new THREE.Vector3(0, 1, 0); // Look slightly above dog
    this.cameraSmoothness = 5;

    // Input state
    this.keys = {
      forward: false,  // W
      backward: false, // S
      left: false,     // A
      right: false,    // D
      run: false,      // Shift
      jump: false,     // Space
    };

    this.setupInputListeners();
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(event) {
    if (!this.isActive) return;

    switch (event.code) {
      case 'KeyW': this.keys.forward = true; break;
      case 'KeyS': this.keys.backward = true; break;
      case 'KeyA': this.keys.left = true; break;
      case 'KeyD': this.keys.right = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.run = true; break;
      case 'Space':
        if (!this.keys.jump) {
          this.keys.jump = true;
          this.controlledDog.jump();
        }
        break;
      case 'Escape':
        this.exitDogMode();
        break;
    }
  }

  onKeyUp(event) {
    if (!this.isActive) return;

    switch (event.code) {
      case 'KeyW': this.keys.forward = false; break;
      case 'KeyS': this.keys.backward = false; break;
      case 'KeyA': this.keys.left = false; break;
      case 'KeyD': this.keys.right = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.run = false; break;
      case 'Space': this.keys.jump = false; break;
    }
  }

  enterDogMode(dog) {
    this.controlledDog = dog;
    this.isActive = true;
    dog.isPlayerControlled = true;

    // Disable orbit controls
    this.orbitControls.enabled = false;

    // Show exit hint
    this.showExitHint();

    console.log(`Now controlling: ${dog.getDisplayName()}`);
  }

  exitDogMode() {
    if (!this.isActive) return;

    this.controlledDog.isPlayerControlled = false;
    this.controlledDog = null;
    this.isActive = false;

    // Re-enable orbit controls
    this.orbitControls.enabled = true;

    // Reset keys
    Object.keys(this.keys).forEach(k => this.keys[k] = false);

    // Hide exit hint
    this.hideExitHint();

    // Callback if set
    if (this.onExitDogMode) {
      this.onExitDogMode();
    }
  }

  showExitHint() {
    let hint = document.getElementById('dog-mode-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'dog-mode-hint';
      hint.innerHTML = `
        <div class="hint-controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd>Shift</kbd> Run</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>Esc</kbd> Exit</span>
        </div>
      `;
      document.body.appendChild(hint);
    }
    hint.classList.remove('hidden');
  }

  hideExitHint() {
    const hint = document.getElementById('dog-mode-hint');
    if (hint) hint.classList.add('hidden');
  }

  update(delta) {
    if (!this.isActive || !this.controlledDog) return;

    const dog = this.controlledDog;

    // Calculate movement direction relative to camera
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

    // Input direction
    const moveDirection = new THREE.Vector3();

    if (this.keys.forward) moveDirection.add(cameraDirection);
    if (this.keys.backward) moveDirection.sub(cameraDirection);
    if (this.keys.left) moveDirection.sub(cameraRight);
    if (this.keys.right) moveDirection.add(cameraRight);

    // Apply movement to dog
    if (moveDirection.length() > 0) {
      moveDirection.normalize();

      const speed = this.keys.run ? dog.getRunSpeed() : dog.getWalkSpeed();
      dog.model.position.x += moveDirection.x * speed * delta;
      dog.model.position.z += moveDirection.z * speed * delta;

      // Face movement direction
      const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
      dog.model.rotation.y = THREE.MathUtils.lerp(
        dog.model.rotation.y,
        targetAngle,
        delta * 10
      );

      // Set animation state
      dog.setState(this.keys.run ? 'run' : 'walk');
    } else {
      if (dog.state !== 'jump') {
        dog.setState('idle');
      }
    }

    // Clamp to bounds
    dog.model.position.x = THREE.MathUtils.clamp(dog.model.position.x, -25, 25);
    dog.model.position.z = THREE.MathUtils.clamp(dog.model.position.z, -25, 25);

    // Update camera - third person follow
    this.updateCamera(delta);
  }

  updateCamera(delta) {
    const dog = this.controlledDog;
    const dogPos = dog.model.position;

    // Calculate desired camera position (behind dog)
    const dogForward = new THREE.Vector3(0, 0, 1);
    dogForward.applyQuaternion(dog.model.quaternion);

    const desiredPos = new THREE.Vector3()
      .copy(dogPos)
      .add(new THREE.Vector3(0, this.cameraOffset.y, 0))
      .sub(dogForward.multiplyScalar(this.cameraOffset.z));

    // Smooth camera movement
    this.camera.position.lerp(desiredPos, delta * this.cameraSmoothness);

    // Look at dog
    const lookTarget = dogPos.clone().add(this.cameraLookOffset);
    this.camera.lookAt(lookTarget);
  }
}
```

CSS for control hints:
```css
#dog-mode-hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 12px 20px;
  z-index: 100;
  font-family: system-ui, sans-serif;
  color: white;
}

#dog-mode-hint.hidden {
  display: none;
}

.hint-controls {
  display: flex;
  gap: 20px;
  font-size: 13px;
}

.hint-controls kbd {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  margin-right: 4px;
}
```

**Acceptance Criteria**:
- [ ] Clicking "Become Dog" enters dog control mode
- [ ] WASD moves dog relative to camera direction
- [ ] Shift makes dog run
- [ ] Space makes dog jump
- [ ] Camera follows behind dog (over-the-shoulder)
- [ ] Escape exits dog mode
- [ ] Orbit controls disabled during dog mode
- [ ] Control hints displayed at bottom

### Task 3.2: Integrate Dog Controller
**Agent**: JavaScript
**Files**: `src/main.js`, `src/dog.js`

Wire up the dog controller:

```javascript
// In main.js
import { DogController } from './dogController.js';

const dogController = new DogController(camera, controls);

// Connect UI to controller
ui.onBecomeDog = (dog) => {
  dogController.enterDogMode(dog);
  ui.hideStatusPanel();
};

dogController.onExitDogMode = () => {
  // Reset camera position smoothly
  controls.target.set(0, 0, 0);
};

// In animate loop
function animate() {
  // ...
  dogController.update(delta);
  // Only update dog AI if not player controlled
  dogManager.update(delta);
  // ...
}
```

Add to Dog class:
```javascript
// In dog.js - add property
this.isPlayerControlled = false;

// In update() - skip AI if player controlled
update(delta, cursorWorldPos, allDogs) {
  this.mixer.update(delta);

  // Skip AI when player controlled
  if (this.isPlayerControlled) {
    this.updateAge(delta);
    return;
  }

  // ... rest of existing update logic
}
```

**Acceptance Criteria**:
- [ ] "Become Dog" button triggers controller
- [ ] Dog AI paused while controlled
- [ ] Age still progresses while controlled
- [ ] Smooth transition back to orbit controls

### Human Review Checkpoint 3
- [ ] Dog control feels responsive
- [ ] Camera doesn't clip through ground
- [ ] Transition in/out is smooth
- [ ] Controls are intuitive

---

## Wave 4: Polish
**Parallel Tasks**: 1 agent
**Depends on**: Wave 2

### Task 3.1: Visual Feedback and Animation
**Agent**: JavaScript/CSS
**Files**: `src/interaction.js`, `src/dog.js`

Add juice to the interactions:

- Play jump animation when picked up
- Slight scale-up when held (1.1x)
- Squash/stretch on landing
- Shadow grows/shrinks with height
- Optional: particle effect on landing

```javascript
// When picked
dog.jump(); // Play jump animation
dog.model.scale.multiplyScalar(1.1);

// When released/flying
// Rotate dog in direction of travel

// On landing
dog.model.scale.y *= 0.8; // Squash
setTimeout(() => dog.updateAppearance(), 100); // Reset
```

**Acceptance Criteria**:
- [ ] Dog plays jump anim when grabbed
- [ ] Dog scales up slightly while held
- [ ] Dog rotates to face fling direction
- [ ] Landing has squash effect
- [ ] All effects reset properly

---

## Rollback Plan

If issues arise:
1. InteractionManager can be disabled by not calling update()
2. UI toolbar can be hidden with CSS `display: none`
3. All changes are additive - removing imports reverts to basic simulation

## Success Metrics

- Pick/fling latency < 16ms (60fps maintained)
- Fling velocity feels natural and controllable
- UI is intuitive without tutorial
- No dogs stuck in invalid states after fling
