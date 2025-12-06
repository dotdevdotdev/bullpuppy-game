import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  BOUNDS, MIN_DISTANCE, SPEEDS, AGE, SCALES, COLOR_TINTS,
  BEHAVIOR, COURTSHIP, LIFE_STAGE, GENDER
} from './config.js';

let dogIdCounter = 0;

export class Dog {
  constructor(baseModel, animations, baseYOffset, manager, options = {}) {
    this.id = ++dogIdCounter;
    this.manager = manager;
    this.baseYOffset = baseYOffset;

    // Identity
    this.gender = options.gender || (Math.random() > 0.5 ? GENDER.MALE : GENDER.FEMALE);
    this.lifeStage = options.lifeStage || LIFE_STAGE.PUPPY;
    this.ageYears = options.age || 0;
    this.ageTimer = 0;

    // Relationships
    this.family = null;
    this.parents = [];
    this.mate = null;

    // Courtship state
    this.isCourtship = false;
    this.courtshipPartner = null;
    this.courtshipTimer = 0;
    this.courtshipJumpTimer = 0;
    this.courtshipAngle = Math.random() * Math.PI * 2;

    // Custom appearance (set by baby maker)
    this.customColorTint = options.customColorTint || null;
    this.customName = options.customName || null;
    this.nametag = null;

    // Clone and setup model
    this.model = clone(baseModel);

    // Store the base scale from the normalized model
    this.baseScale = baseModel.scale.x; // Assumes uniform scale

    this.setupAnimations(animations);

    // Apply appearance based on type
    this.updateAppearance();

    // Movement state
    this.target = new THREE.Vector3();
    this.speed = 0;
    this.targetSpeed = this.getWalkSpeed();
    this.rotationSpeed = 3;
    this.state = 'idle';
    this.idleTimer = 0;
    this.idleDuration = 1 + Math.random() * 3;

    // Following state
    this.isFollowingCursor = false;
    this.followTarget = null; // Another dog to follow

    // Physics state (for pick/fling)
    this.isPicked = false;
    this.isFlying = false;
    this.velocity = new THREE.Vector3();

    // Player control state
    this.isPlayerControlled = false;

    // Birth time for stats
    this.birthTime = Date.now();

    // Position
    if (options.position) {
      this.model.position.copy(options.position);
      this.model.position.y = this.yOffset;
    } else {
      this.model.position.set(
        (Math.random() - 0.5) * BOUNDS,
        this.yOffset,
        (Math.random() - 0.5) * BOUNDS
      );
    }
    this.model.rotation.y = Math.random() * Math.PI * 2;

    this.setState('idle');
  }

  setupAnimations(animations) {
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = {};
    this.currentAction = null;

    for (const [name, clip] of Object.entries(animations)) {
      const action = this.mixer.clipAction(clip);
      if (name === 'jump') {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      }
      this.animations[name] = action;
    }

    this.mixer.addEventListener('finished', (e) => {
      if (this.state === 'jump') {
        this.setState('idle');
        this.idleDuration = 0.5 + Math.random() * 1;
        this.idleTimer = 0;
      }
    });
  }

  // Get the type key for scales/colors
  getTypeKey() {
    if (this.lifeStage === LIFE_STAGE.PARENT) {
      return this.gender === GENDER.MALE ? 'DADDY' : 'MOMMY';
    } else if (this.lifeStage === LIFE_STAGE.DOG) {
      return this.gender === GENDER.MALE ? 'BOY_DOG' : 'GIRL_DOG';
    } else {
      return this.gender === GENDER.MALE ? 'BOY_PUPPY' : 'GIRL_PUPPY';
    }
  }

  getScale() {
    return SCALES[this.getTypeKey()];
  }

  getColorTint() {
    // Use custom color tint if set, otherwise use default for type
    return this.customColorTint || COLOR_TINTS[this.getTypeKey()];
  }

  getWalkSpeed() {
    if (this.lifeStage === LIFE_STAGE.PARENT) return SPEEDS.PARENT_WALK;
    if (this.lifeStage === LIFE_STAGE.DOG) return SPEEDS.DOG_WALK;
    return SPEEDS.PUPPY_WALK;
  }

  getRunSpeed() {
    if (this.lifeStage === LIFE_STAGE.PARENT) return SPEEDS.PARENT_RUN;
    if (this.lifeStage === LIFE_STAGE.DOG) return SPEEDS.DOG_RUN;
    return SPEEDS.PUPPY_RUN;
  }

  get yOffset() {
    return this.baseYOffset * this.getScale();
  }

  updateAppearance() {
    const typeScale = this.getScale();
    const finalScale = this.baseScale * typeScale;
    this.model.scale.setScalar(finalScale);

    // Apply color tint
    const tint = this.getColorTint();
    this.model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone material to avoid affecting other dogs
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
          child.material = child.material.clone();
        }

        const mat = child.material;
        if (mat.color) {
          // Get original color
          const origMat = child.userData.originalMaterial;
          const origColor = origMat.color.clone();

          // Convert to HSL, adjust, convert back
          const hsl = {};
          origColor.getHSL(hsl);

          hsl.h = (hsl.h + tint.hue) % 1;
          hsl.s = Math.min(1, Math.max(0, hsl.s * tint.saturation));
          hsl.l = Math.min(1, Math.max(0, hsl.l + tint.lightness));

          mat.color.setHSL(hsl.h, hsl.s, hsl.l);
        }
      }
    });
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

  jump() {
    if (this.animations['jump']) {
      this.setState('jump');
    }
  }

  // Age up and potentially evolve
  updateAge(delta) {
    this.ageTimer += delta;

    if (this.ageTimer >= AGE.YEAR_DURATION) {
      this.ageTimer = 0;
      this.ageYears++;

      // Check for maturity
      if (this.lifeStage === LIFE_STAGE.PUPPY && this.ageYears >= AGE.MATURITY_AGE) {
        this.evolveTodog();
      }

      console.log(`Dog ${this.id} (${this.gender}) is now ${this.ageYears} years old`);
    }
  }

  evolveTodog() {
    this.lifeStage = LIFE_STAGE.DOG;
    this.updateAppearance();
    console.log(`Dog ${this.id} grew up into a ${this.gender === GENDER.MALE ? 'boy' : 'girl'} dog!`);
  }

  evolveToParent() {
    this.lifeStage = LIFE_STAGE.PARENT;
    this.updateAppearance();
    console.log(`Dog ${this.id} is now a ${this.gender === GENDER.MALE ? 'daddy' : 'mommy'}!`);
  }

  canMate() {
    // Dogs can mate, parents can only mate with their existing mate
    if (this.lifeStage === LIFE_STAGE.PUPPY) return false;
    if (this.lifeStage === LIFE_STAGE.PARENT && this.mate) return true;
    if (this.lifeStage === LIFE_STAGE.DOG && !this.mate) return true;
    return false;
  }

  canMateWith(other) {
    if (!this.canMate() || !other.canMate()) return false;
    if (this.gender === other.gender) return false;

    // Parents can only mate with their existing mate
    if (this.lifeStage === LIFE_STAGE.PARENT) {
      return this.mate === other;
    }
    if (other.lifeStage === LIFE_STAGE.PARENT) {
      return other.mate === this;
    }

    // Dogs can mate with other unmated dogs
    return true;
  }

  startCourtship(partner) {
    this.isCourtship = true;
    this.courtshipPartner = partner;
    this.courtshipTimer = 0;
    this.courtshipJumpTimer = 0;
    this.courtshipAngle = Math.atan2(
      partner.model.position.x - this.model.position.x,
      partner.model.position.z - this.model.position.z
    );
    this.setState('idle');
    console.log(`Dog ${this.id} started courtship with Dog ${partner.id}`);
  }

  updateCourtship(delta) {
    if (!this.isCourtship || !this.courtshipPartner) return false;

    this.courtshipTimer += delta;
    this.courtshipJumpTimer += delta;

    // Calculate shared center between the two dogs (for tail-chase effect)
    const center = new THREE.Vector3().addVectors(
      this.model.position,
      this.courtshipPartner.model.position
    ).multiplyScalar(0.5);

    // Slow circle around shared center - both dogs orbit same point, 180° apart
    this.courtshipAngle += COURTSHIP.CIRCLE_SPEED * delta * 0.5;
    const radius = 2.5;

    // Target position on the circle
    this.target.set(
      center.x + Math.sin(this.courtshipAngle) * radius,
      0,
      center.z + Math.cos(this.courtshipAngle) * radius
    );

    // Slow walking speed during courtship
    this.targetSpeed = this.getWalkSpeed() * 0.6;

    // Jump periodically
    if (this.courtshipJumpTimer >= COURTSHIP.JUMP_INTERVAL) {
      this.courtshipJumpTimer = 0;
      if (this.state !== 'jump') {
        this.jump();
      }
    }

    // Don't manually set rotation here - let moveTowardsTarget handle it
    // This way dogs face their movement direction (chasing the other's tail)

    // Courtship complete!
    if (this.courtshipTimer >= COURTSHIP.DURATION) {
      return true; // Signal breeding should happen
    }

    // Always walk during courtship (not run)
    if (this.state !== 'jump') {
      this.setState('walk');
    }

    return false;
  }

  endCourtship() {
    this.isCourtship = false;
    this.courtshipPartner = null;
    this.courtshipTimer = 0;
  }

  pickNewTarget() {
    this.isFollowingCursor = false;
    this.followTarget = null;

    // If in a family and has parents, sometimes follow them
    if (this.family && this.parents.length > 0 && this.lifeStage === LIFE_STAGE.PUPPY) {
      if (Math.random() < 0.6) {
        this.followTarget = this.parents[Math.floor(Math.random() * this.parents.length)];
        this.targetSpeed = this.getWalkSpeed() * 1.1;
        this.setState('walk');
        return;
      }
    }

    // If parent, sometimes go to mate
    if (this.lifeStage === LIFE_STAGE.PARENT && this.mate && Math.random() < 0.4) {
      this.followTarget = this.mate;
      this.targetSpeed = this.getWalkSpeed();
      this.setState('walk');
      return;
    }

    // Random wander
    this.targetSpeed = Math.random() > 0.7 ? this.getRunSpeed() : this.getWalkSpeed();
    this.target.set(
      (Math.random() - 0.5) * BOUNDS,
      0,
      (Math.random() - 0.5) * BOUNDS
    );

    this.setState(this.targetSpeed >= this.getRunSpeed() ? 'run' : 'walk');
  }

  followCursor(cursorPos) {
    this.isFollowingCursor = true;
    this.followTarget = null;
    this.target.copy(cursorPos);
    this.targetSpeed = this.getWalkSpeed() * 1.2;

    if (this.state === 'idle' || this.state === 'jump') {
      this.setState('walk');
    }
  }

  getAvoidanceForce(allDogs) {
    const avoidance = new THREE.Vector3();
    const myPos = this.model.position;
    const myScale = this.getScale();

    for (const other of allDogs) {
      if (other === this) continue;
      if (other === this.courtshipPartner) continue; // Don't avoid courtship partner

      const otherPos = other.model.position;
      const distance = myPos.distanceTo(otherPos);
      const avoidDist = BEHAVIOR.COLLISION_DISTANCE * Math.max(myScale, other.getScale());

      if (distance < avoidDist && distance > 0.01) {
        const pushDir = new THREE.Vector3()
          .subVectors(myPos, otherPos)
          .normalize();

        const strength = (avoidDist - distance) / avoidDist;
        avoidance.add(pushDir.multiplyScalar(strength * BEHAVIOR.AVOIDANCE_STRENGTH));
      }
    }

    return avoidance;
  }

  findPotentialMate(allDogs) {
    if (!this.canMate()) return null;

    let closest = null;
    let closestDist = COURTSHIP.DETECT_DISTANCE;

    for (const other of allDogs) {
      if (other === this) continue;
      if (!this.canMateWith(other)) continue;
      if (other.isCourtship) continue;

      const dist = this.model.position.distanceTo(other.model.position);
      if (dist < closestDist) {
        closest = other;
        closestDist = dist;
      }
    }

    return closest;
  }

  updatePhysics(delta) {
    if (!this.isFlying) return;

    // Apply gravity
    this.velocity.y -= 25 * delta;

    // Move
    this.model.position.x += this.velocity.x * delta;
    this.model.position.y += this.velocity.y * delta;
    this.model.position.z += this.velocity.z * delta;

    // Ground collision
    if (this.model.position.y <= this.yOffset) {
      this.model.position.y = this.yOffset;
      this.velocity.set(0, 0, 0);
      this.isFlying = false;
      // Play landing effect - squash
      this.setState('idle');
    }

    // Bounds
    this.model.position.x = THREE.MathUtils.clamp(this.model.position.x, -BOUNDS / 2, BOUNDS / 2);
    this.model.position.z = THREE.MathUtils.clamp(this.model.position.z, -BOUNDS / 2, BOUNDS / 2);

    // Face velocity direction while flying
    if (this.velocity.length() > 0.1) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetAngle, delta * 5);
    }
  }

  update(delta, cursorWorldPos, allDogs) {
    this.mixer.update(delta);

    // Skip all AI when picked or flying
    if (this.isPicked || this.isFlying) {
      return;
    }

    // Skip AI when player controlled (but still age)
    if (this.isPlayerControlled) {
      this.updateAge(delta);
      return;
    }

    // Age
    this.updateAge(delta);

    // Courtship takes priority
    if (this.isCourtship) {
      const breedingComplete = this.updateCourtship(delta);
      if (breedingComplete) {
        // Signal manager to handle breeding
        this.manager.handleBreeding(this, this.courtshipPartner);
        this.endCourtship();
        return;
      }
      // Still courting - do movement
      this.moveTowardsTarget(delta, allDogs);
      return;
    }

    // Check for cursor
    if (cursorWorldPos && this.state !== 'jump') {
      const distToCursor = this.model.position.distanceTo(cursorWorldPos);
      if (distToCursor < BEHAVIOR.FOLLOW_DISTANCE) {
        this.followCursor(cursorWorldPos);
      } else if (this.isFollowingCursor) {
        this.pickNewTarget();
      }
    }

    // Check for potential mates (dogs only, not puppies)
    if (!this.isFollowingCursor && this.canMate() && !this.isCourtship) {
      const potentialMate = this.findPotentialMate(allDogs);
      if (potentialMate) {
        const dist = this.model.position.distanceTo(potentialMate.model.position);
        if (dist < COURTSHIP.START_DISTANCE) {
          // Start courtship!
          this.startCourtship(potentialMate);
          potentialMate.startCourtship(this);
          return;
        } else {
          // Move towards potential mate
          this.followTarget = potentialMate;
          this.targetSpeed = this.getWalkSpeed();
          if (this.state === 'idle') {
            this.setState('walk');
          }
        }
      }
    }

    // Update follow target position
    if (this.followTarget && !this.isFollowingCursor) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      );
      this.target.copy(this.followTarget.model.position).add(offset);
    }

    // Idle state
    if (this.state === 'idle') {
      this.idleTimer += delta;
      if (this.idleTimer >= this.idleDuration) {
        this.idleTimer = 0;
        if (Math.random() < BEHAVIOR.JUMP_CHANCE && this.lifeStage !== LIFE_STAGE.PARENT) {
          this.jump();
        } else {
          this.pickNewTarget();
        }
      }
      return;
    }

    if (this.state === 'jump') {
      return;
    }

    // Move
    this.moveTowardsTarget(delta, allDogs);
  }

  moveTowardsTarget(delta, allDogs) {
    const position = this.model.position;
    const direction = new THREE.Vector3()
      .subVectors(this.target, position);
    direction.y = 0;

    const distance = direction.length();

    if (distance < MIN_DISTANCE) {
      this.setState('idle');
      this.idleDuration = this.isCourtship ? 0.1 : (1 + Math.random() * 3);
      this.idleTimer = 0;
      return;
    }

    direction.normalize();

    // Avoidance
    const avoidance = this.getAvoidanceForce(allDogs);
    direction.add(avoidance);

    // Family cohesion
    if (this.family) {
      const cohesion = this.family.getCohesionForce(this);
      direction.add(cohesion);
    }

    direction.normalize();

    // Speed
    this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, delta * 3);

    // Move
    position.x += direction.x * this.speed * delta;
    position.z += direction.z * this.speed * delta;
    position.y = this.yOffset;

    // Bounds
    position.x = THREE.MathUtils.clamp(position.x, -BOUNDS / 2, BOUNDS / 2);
    position.z = THREE.MathUtils.clamp(position.z, -BOUNDS / 2, BOUNDS / 2);

    // Rotation - face movement direction
    const targetAngle = Math.atan2(direction.x, direction.z);
    let currentAngle = this.model.rotation.y;

    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    this.model.rotation.y += angleDiff * this.rotationSpeed * delta;
  }

  getDisplayName() {
    // Use custom name if set
    if (this.customName) {
      return this.customName;
    }

    const genderName = this.gender === GENDER.MALE ? 'Boy' : 'Girl';
    const stageName = {
      [LIFE_STAGE.PUPPY]: 'Puppy',
      [LIFE_STAGE.DOG]: 'Dog',
      [LIFE_STAGE.PARENT]: this.gender === GENDER.MALE ? 'Daddy' : 'Mommy',
    }[this.lifeStage];

    return `${genderName} ${stageName} #${this.id}`;
  }
}
