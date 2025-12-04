import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const BOUNDS = 40;
const MIN_DISTANCE = 0.5;
const WALK_SPEED = 1.5;
const RUN_SPEED = 4;
const IDLE_CHANCE = 0.3; // 30% chance to idle when reaching target

export class Puppy {
  constructor(model, animations, yOffset) {
    // Clone model with skeleton
    this.model = clone(model);
    this.yOffset = yOffset;

    // Animation setup
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = {};
    this.currentAction = null;

    // Store animation actions
    for (const [name, clip] of Object.entries(animations)) {
      this.animations[name] = this.mixer.clipAction(clip);
    }

    // Movement state
    this.target = new THREE.Vector3();
    this.speed = 0;
    this.targetSpeed = WALK_SPEED;
    this.rotationSpeed = 3;
    this.state = 'idle'; // idle, walk, run
    this.idleTimer = 0;
    this.idleDuration = 0;

    // Random starting position
    this.model.position.set(
      (Math.random() - 0.5) * BOUNDS,
      this.yOffset,
      (Math.random() - 0.5) * BOUNDS
    );

    // Random starting rotation
    this.model.rotation.y = Math.random() * Math.PI * 2;

    // Start idling
    this.setState('idle');
    this.idleDuration = 1 + Math.random() * 3;
  }

  setState(newState) {
    if (this.state === newState) return;

    this.state = newState;

    // Fade out current animation
    if (this.currentAction) {
      this.currentAction.fadeOut(0.3);
    }

    // Play new animation
    const action = this.animations[newState];
    if (action) {
      action.reset();
      action.fadeIn(0.3);
      action.play();
      this.currentAction = action;
    }
  }

  pickNewTarget() {
    // Decide to walk or run
    this.targetSpeed = Math.random() > 0.7 ? RUN_SPEED : WALK_SPEED;

    this.target.set(
      (Math.random() - 0.5) * BOUNDS,
      0,
      (Math.random() - 0.5) * BOUNDS
    );

    const newState = this.targetSpeed >= RUN_SPEED ? 'run' : 'walk';
    this.setState(newState);
  }

  update(delta) {
    // Update animation mixer
    this.mixer.update(delta);

    // State machine
    if (this.state === 'idle') {
      this.idleTimer += delta;
      if (this.idleTimer >= this.idleDuration) {
        this.idleTimer = 0;
        this.pickNewTarget();
      }
      return;
    }

    // Moving states (walk/run)
    const position = this.model.position;
    const direction = new THREE.Vector3()
      .subVectors(this.target, position);
    direction.y = 0;

    const distance = direction.length();

    // Reached target?
    if (distance < MIN_DISTANCE) {
      // Maybe idle for a bit
      if (Math.random() < IDLE_CHANCE) {
        this.setState('idle');
        this.idleDuration = 2 + Math.random() * 4;
        this.idleTimer = 0;
      } else {
        this.pickNewTarget();
      }
      return;
    }

    direction.normalize();

    // Smooth speed change
    this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, delta * 3);

    // Move toward target
    position.x += direction.x * this.speed * delta;
    position.z += direction.z * this.speed * delta;
    position.y = this.yOffset; // Keep feet on ground

    // Rotate to face movement direction
    const targetAngle = Math.atan2(direction.x, direction.z);
    let currentAngle = this.model.rotation.y;

    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    this.model.rotation.y += angleDiff * this.rotationSpeed * delta;
  }
}

export class PuppyManager {
  constructor(scene) {
    this.scene = scene;
    this.puppies = [];
    this.baseModel = null;
    this.animations = {};
  }

  async load(count = 5) {
    const loader = new GLTFLoader();

    // Load base model and all animations in parallel
    const [modelGltf, idleGltf, walkGltf, runGltf] = await Promise.all([
      loader.loadAsync('/bulldog_puppy.glb'),
      loader.loadAsync('/bulldog_puppy_idle.glb'),
      loader.loadAsync('/bulldog_puppy_walk.glb'),
      loader.loadAsync('/bulldog_puppy_run.glb'),
    ]);

    this.baseModel = modelGltf.scene;

    // Extract animation clips
    this.animations = {
      idle: idleGltf.animations[0],
      walk: walkGltf.animations[0],
      run: runGltf.animations[0],
    };

    // Auto-scale model
    const box = new THREE.Box3().setFromObject(this.baseModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    this.baseModel.scale.setScalar(scale);

    // Recalculate box after scaling
    box.setFromObject(this.baseModel);

    // Calculate Y offset to place feet on ground
    this.yOffset = -box.min.y;

    // Enable shadows
    this.baseModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Create puppies
    for (let i = 0; i < count; i++) {
      const puppy = new Puppy(this.baseModel, this.animations, this.yOffset);
      this.puppies.push(puppy);
      this.scene.add(puppy.model);
    }

    console.log(`Loaded ${count} animated puppies!`);
  }

  update(delta) {
    for (const puppy of this.puppies) {
      puppy.update(delta);
    }
  }
}
