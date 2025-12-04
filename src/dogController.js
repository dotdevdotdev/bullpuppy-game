import * as THREE from 'three';

export class DogController {
  constructor(camera, orbitControls) {
    this.camera = camera;
    this.orbitControls = orbitControls;

    this.controlledDog = null;
    this.isActive = false;

    // Camera settings
    this.cameraOffset = new THREE.Vector3(0, 4, 8);
    this.cameraLookOffset = new THREE.Vector3(0, 1, 0);
    this.cameraSmoothness = 5;

    // Store original camera state for restoration
    this.originalCameraPos = new THREE.Vector3();
    this.originalTarget = new THREE.Vector3();

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false,
      jump: false,
    };

    // Callback
    this.onExitDogMode = null;

    this.setupInputListeners();
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(event) {
    if (!this.isActive) return;

    switch (event.code) {
      case 'KeyW':
        this.keys.forward = true;
        event.preventDefault();
        break;
      case 'KeyS':
        this.keys.backward = true;
        event.preventDefault();
        break;
      case 'KeyA':
        this.keys.left = true;
        event.preventDefault();
        break;
      case 'KeyD':
        this.keys.right = true;
        event.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.run = true;
        break;
      case 'Space':
        if (!this.keys.jump && this.controlledDog.state !== 'jump') {
          this.keys.jump = true;
          this.controlledDog.jump();
        }
        event.preventDefault();
        break;
      case 'Escape':
        this.exitDogMode();
        break;
    }
  }

  onKeyUp(event) {
    if (!this.isActive) return;

    switch (event.code) {
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.run = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
    }
  }

  enterDogMode(dog) {
    this.controlledDog = dog;
    this.isActive = true;
    dog.isPlayerControlled = true;

    // Store original camera state
    this.originalCameraPos.copy(this.camera.position);
    this.originalTarget.copy(this.orbitControls.target);

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

    // Reset camera to look at origin
    this.orbitControls.target.set(0, 0, 0);

    // Reset keys
    Object.keys(this.keys).forEach(k => this.keys[k] = false);

    // Hide exit hint
    this.hideExitHint();

    // Callback
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

    // Apply movement
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
      if (dog.state !== 'jump') {
        dog.setState(this.keys.run ? 'run' : 'walk');
      }
    } else {
      if (dog.state !== 'jump') {
        dog.setState('idle');
      }
    }

    // Clamp to bounds
    dog.model.position.x = THREE.MathUtils.clamp(dog.model.position.x, -25, 25);
    dog.model.position.z = THREE.MathUtils.clamp(dog.model.position.z, -25, 25);

    // Update camera
    this.updateCamera(delta);
  }

  updateCamera(delta) {
    const dog = this.controlledDog;
    const dogPos = dog.model.position;

    // Calculate desired camera position (behind dog)
    const dogForward = new THREE.Vector3(0, 0, 1);
    dogForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), dog.model.rotation.y);

    const desiredPos = new THREE.Vector3()
      .copy(dogPos)
      .add(new THREE.Vector3(0, this.cameraOffset.y, 0))
      .sub(dogForward.multiplyScalar(this.cameraOffset.z));

    // Ensure camera doesn't go below ground
    desiredPos.y = Math.max(desiredPos.y, 2);

    // Smooth camera movement
    this.camera.position.lerp(desiredPos, delta * this.cameraSmoothness);

    // Look at dog
    const lookTarget = dogPos.clone().add(this.cameraLookOffset);
    this.camera.lookAt(lookTarget);
  }
}
