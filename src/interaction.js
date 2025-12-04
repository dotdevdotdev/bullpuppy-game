import * as THREE from 'three';

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
    this.selectedDog = null;
    this.pendingPickDog = null;
    this.liftHeight = 3;

    // Click detection
    this.clickStartPos = { x: 0, y: 0 };
    this.clickStartTime = 0;
    this.isDragging = false;

    // Fling velocity tracking
    this.dragHistory = [];
    this.maxDragHistory = 5;

    // Callbacks
    this.onDogSelected = null;
    this.onDogDeselected = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  getMouseWorldPos() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
      return intersection;
    }
    return null;
  }

  getDogUnderCursor() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all dog meshes
    const dogMeshes = [];
    for (const dog of this.dogManager.dogs) {
      dog.model.traverse((child) => {
        if (child.isMesh) {
          child.userData.dog = dog;
          dogMeshes.push(child);
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(dogMeshes, false);
    if (intersects.length > 0) {
      return intersects[0].object.userData.dog;
    }
    return null;
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update hovered dog
    if (!this.pickedDog) {
      this.hoveredDog = this.getDogUnderCursor();
    }

    // Check if dragging started
    if (this.pendingPickDog && !this.isDragging) {
      const dragDistance = Math.hypot(
        event.clientX - this.clickStartPos.x,
        event.clientY - this.clickStartPos.y
      );
      if (dragDistance > 5) {
        // Start dragging
        this.isDragging = true;
        this.pickedDog = this.pendingPickDog;
        this.pickedDog.isPicked = true;
        this.pickedDog.jump();

        // Scale up effect
        this.pickedDog.model.scale.multiplyScalar(1.15);

        this.pendingPickDog = null;
      }
    }

    // Move picked dog
    if (this.pickedDog) {
      const worldPos = this.getMouseWorldPos();
      if (worldPos) {
        // Smooth movement while held
        this.pickedDog.model.position.x = THREE.MathUtils.lerp(
          this.pickedDog.model.position.x,
          worldPos.x,
          0.3
        );
        this.pickedDog.model.position.z = THREE.MathUtils.lerp(
          this.pickedDog.model.position.z,
          worldPos.z,
          0.3
        );
        this.pickedDog.model.position.y = THREE.MathUtils.lerp(
          this.pickedDog.model.position.y,
          this.liftHeight,
          0.2
        );

        // Record for velocity
        this.dragHistory.push({
          pos: worldPos.clone(),
          time: Date.now()
        });
        if (this.dragHistory.length > this.maxDragHistory) {
          this.dragHistory.shift();
        }
      }
    }

    // Update cursor
    this.updateCursor();
  }

  onMouseDown(event) {
    if (event.button !== 0) return; // Left click only

    this.clickStartPos = { x: event.clientX, y: event.clientY };
    this.clickStartTime = Date.now();
    this.isDragging = false;

    if (this.hoveredDog) {
      this.pendingPickDog = this.hoveredDog;
    }
  }

  onMouseUp(event) {
    if (event.button !== 0) return;

    const dragDistance = Math.hypot(
      event.clientX - this.clickStartPos.x,
      event.clientY - this.clickStartPos.y
    );
    const clickDuration = Date.now() - this.clickStartTime;

    // Click (select dog)
    if (dragDistance < 5 && clickDuration < 300) {
      if (this.pendingPickDog) {
        this.selectDog(this.pendingPickDog);
      } else if (!this.hoveredDog) {
        this.deselectDog();
      }
      this.pendingPickDog = null;
      return;
    }

    // Release picked dog (fling)
    if (this.pickedDog) {
      const velocity = this.calculateFlingVelocity();
      this.pickedDog.velocity.copy(velocity);
      this.pickedDog.isFlying = true;
      this.pickedDog.isPicked = false;

      // Reset scale
      this.pickedDog.updateAppearance();

      this.pickedDog = null;
      this.dragHistory = [];
    }

    this.pendingPickDog = null;
    this.isDragging = false;
    this.updateCursor();
  }

  calculateFlingVelocity() {
    if (this.dragHistory.length < 2) {
      return new THREE.Vector3(0, 5, 0);
    }

    const recent = this.dragHistory[this.dragHistory.length - 1];
    const older = this.dragHistory[0];
    const timeDelta = (recent.time - older.time) / 1000;

    if (timeDelta < 0.01) {
      return new THREE.Vector3(0, 5, 0);
    }

    const velocity = new THREE.Vector3()
      .subVectors(recent.pos, older.pos)
      .divideScalar(timeDelta);

    // Clamp velocity
    const maxSpeed = 30;
    if (velocity.length() > maxSpeed) {
      velocity.normalize().multiplyScalar(maxSpeed);
    }

    // Add upward component
    velocity.y = Math.max(5, velocity.length() * 0.3);

    return velocity;
  }

  selectDog(dog) {
    this.selectedDog = dog;
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

  updateCursor() {
    const canvas = this.renderer.domElement;
    canvas.classList.remove('hovering-dog', 'dragging-dog');

    if (this.pickedDog) {
      canvas.classList.add('dragging-dog');
    } else if (this.hoveredDog) {
      canvas.classList.add('hovering-dog');
    }
  }

  update(delta) {
    // Update physics for all flying dogs
    for (const dog of this.dogManager.dogs) {
      if (dog.isFlying) {
        dog.updatePhysics(delta);
      }
    }
  }
}
