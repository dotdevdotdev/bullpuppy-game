import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const BOUNDS = 40;
const MIN_DISTANCE = 0.5;
const WALK_SPEED = 1.5;
const RUN_SPEED = 4;
const IDLE_CHANCE = 0.3;
const JUMP_CHANCE = 0.15; // Chance to jump when idle
const FOLLOW_DISTANCE = 8; // How close cursor needs to be to attract puppies
const COLLISION_DISTANCE = 1.5; // Distance to avoid other puppies
const AVOIDANCE_STRENGTH = 2;

export class Puppy {
  constructor(model, animations, yOffset, manager) {
    this.model = clone(model);
    this.yOffset = yOffset;
    this.manager = manager; // Reference to manager for collision detection

    // Animation setup
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = {};
    this.currentAction = null;

    for (const [name, clip] of Object.entries(animations)) {
      const action = this.mixer.clipAction(clip);
      // Jump should not loop
      if (name === 'jump') {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      }
      this.animations[name] = action;
    }

    // Listen for animation finished (for jump)
    this.mixer.addEventListener('finished', (e) => {
      if (this.state === 'jump') {
        this.setState('idle');
        this.idleDuration = 0.5 + Math.random() * 1;
        this.idleTimer = 0;
      }
    });

    // Movement state
    this.target = new THREE.Vector3();
    this.speed = 0;
    this.targetSpeed = WALK_SPEED;
    this.rotationSpeed = 3;
    this.state = 'idle';
    this.idleTimer = 0;
    this.idleDuration = 0;
    this.isFollowingCursor = false;

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

    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }

    const action = this.animations[newState];
    if (action) {
      action.reset();
      action.fadeIn(0.2);
      action.play();
      this.currentAction = action;
    }
  }

  pickNewTarget() {
    this.isFollowingCursor = false;
    this.targetSpeed = Math.random() > 0.7 ? RUN_SPEED : WALK_SPEED;

    this.target.set(
      (Math.random() - 0.5) * BOUNDS,
      0,
      (Math.random() - 0.5) * BOUNDS
    );

    const newState = this.targetSpeed >= RUN_SPEED ? 'run' : 'walk';
    this.setState(newState);
  }

  followCursor(cursorPos) {
    this.isFollowingCursor = true;
    this.target.copy(cursorPos);
    this.targetSpeed = WALK_SPEED * 1.2; // Slightly eager

    if (this.state === 'idle' || this.state === 'jump') {
      this.setState('walk');
    }
  }

  jump() {
    if (this.animations['jump']) {
      this.setState('jump');
    }
  }

  getAvoidanceForce(puppies) {
    const avoidance = new THREE.Vector3();
    const myPos = this.model.position;

    for (const other of puppies) {
      if (other === this) continue;

      const otherPos = other.model.position;
      const distance = myPos.distanceTo(otherPos);

      if (distance < COLLISION_DISTANCE && distance > 0.01) {
        // Push away from other puppy
        const pushDir = new THREE.Vector3()
          .subVectors(myPos, otherPos)
          .normalize();

        // Stronger push when closer
        const strength = (COLLISION_DISTANCE - distance) / COLLISION_DISTANCE;
        avoidance.add(pushDir.multiplyScalar(strength * AVOIDANCE_STRENGTH));
      }
    }

    return avoidance;
  }

  update(delta, cursorWorldPos, puppies) {
    this.mixer.update(delta);

    // Check if cursor is nearby
    if (cursorWorldPos && this.state !== 'jump') {
      const distToCursor = this.model.position.distanceTo(cursorWorldPos);
      if (distToCursor < FOLLOW_DISTANCE) {
        this.followCursor(cursorWorldPos);
      } else if (this.isFollowingCursor) {
        // Cursor moved away, pick new random target
        this.pickNewTarget();
      }
    }

    // State machine
    if (this.state === 'idle') {
      this.idleTimer += delta;
      if (this.idleTimer >= this.idleDuration) {
        this.idleTimer = 0;
        // Random chance to jump instead of walking
        if (Math.random() < JUMP_CHANCE) {
          this.jump();
        } else {
          this.pickNewTarget();
        }
      }
      return;
    }

    if (this.state === 'jump') {
      return; // Don't move while jumping
    }

    // Moving states (walk/run)
    const position = this.model.position;
    const direction = new THREE.Vector3()
      .subVectors(this.target, position);
    direction.y = 0;

    const distance = direction.length();

    // Reached target?
    if (distance < MIN_DISTANCE) {
      if (this.isFollowingCursor) {
        // Keep following, just idle briefly
        this.setState('idle');
        this.idleDuration = 0.3;
        this.idleTimer = 0;
      } else if (Math.random() < IDLE_CHANCE) {
        this.setState('idle');
        this.idleDuration = 2 + Math.random() * 4;
        this.idleTimer = 0;
      } else {
        this.pickNewTarget();
      }
      return;
    }

    direction.normalize();

    // Add collision avoidance
    const avoidance = this.getAvoidanceForce(puppies);
    direction.add(avoidance);
    direction.normalize();

    // Smooth speed change
    this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, delta * 3);

    // Move toward target
    position.x += direction.x * this.speed * delta;
    position.z += direction.z * this.speed * delta;
    position.y = this.yOffset;

    // Keep in bounds
    position.x = THREE.MathUtils.clamp(position.x, -BOUNDS / 2, BOUNDS / 2);
    position.z = THREE.MathUtils.clamp(position.z, -BOUNDS / 2, BOUNDS / 2);

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
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.puppies = [];
    this.baseModel = null;
    this.animations = {};
    this.yOffset = 0;

    // Mouse tracking
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.cursorWorldPos = null;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Listen for mouse movement
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  onMouseMove(event) {
    // Convert to normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast to ground plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
      this.cursorWorldPos = intersection;
    }
  }

  async load(count = 5) {
    const loader = new GLTFLoader();

    const [modelGltf, idleGltf, walkGltf, runGltf, jumpGltf] = await Promise.all([
      loader.loadAsync('/bulldog_puppy.glb'),
      loader.loadAsync('/bulldog_puppy_idle.glb'),
      loader.loadAsync('/bulldog_puppy_walk.glb'),
      loader.loadAsync('/bulldog_puppy_run.glb'),
      loader.loadAsync('/bulldog_puppy_jump.glb'),
    ]);

    this.baseModel = modelGltf.scene;

    this.animations = {
      idle: idleGltf.animations[0],
      walk: walkGltf.animations[0],
      run: runGltf.animations[0],
      jump: jumpGltf.animations[0],
    };

    // Auto-scale model
    const box = new THREE.Box3().setFromObject(this.baseModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    this.baseModel.scale.setScalar(scale);

    // Recalculate box after scaling
    box.setFromObject(this.baseModel);
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
      const puppy = new Puppy(this.baseModel, this.animations, this.yOffset, this);
      this.puppies.push(puppy);
      this.scene.add(puppy.model);
    }

    console.log(`Loaded ${count} animated puppies with jump & follow!`);
  }

  update(delta) {
    for (const puppy of this.puppies) {
      puppy.update(delta, this.cursorWorldPos, this.puppies);
    }
  }
}
