import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Dog } from './dog.js';
import { Family } from './family.js';
import { LIFE_STAGE, GENDER, BOUNDS, BEHAVIOR, AGE } from './config.js';

export class DogManager {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.dogs = [];
    this.families = [];
    this.baseModel = null;
    this.animations = {};
    this.baseYOffset = 0;

    // Mouse tracking
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.cursorWorldPos = null;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Baby maker mode
    this.babyMakerActive = false;
    this.babyMakerDog1 = null;
    this.babyMakerDog2 = null;
    this.babyMakerBabies = 0;
    this.babyMakerTimer = 0;
    this.babyMakerMinBabies = 3;
    this.babyMakerMaxBabies = 5;
    this.babyMakerSpawnInterval = 1.5; // Spawn baby every 1.5 seconds of circling
    this.babyMakerPendingBabies = 0; // Babies to spawn when stopped

    // Callback for UI updates
    this.onBabyMakerUpdate = null;
    this.onBabyMakerEnd = null;

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
      this.cursorWorldPos = intersection;
    }
  }

  async load() {
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

    // Normalize base model scale
    const box = new THREE.Box3().setFromObject(this.baseModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    this.baseModel.scale.setScalar(scale);

    box.setFromObject(this.baseModel);
    this.baseYOffset = -box.min.y;

    // Enable shadows
    this.baseModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Create initial population
    this.createInitialPopulation();

    console.log('Dog simulation loaded!');
  }

  createInitialPopulation() {
    // Create a starter family: Daddy + Mommy pair
    const family1 = this.createFamily(
      new THREE.Vector3(-8, 0, -5),
      new THREE.Vector3(-6, 0, -5)
    );

    // Add 2 puppies to the family
    this.spawnPuppy(family1, new THREE.Vector3(-7, 0, -3), GENDER.MALE);
    this.spawnPuppy(family1, new THREE.Vector3(-7, 0, -7), GENDER.FEMALE);

    // Create 2 young dogs (ready to mate and form new family)
    this.createDog({
      gender: GENDER.MALE,
      lifeStage: LIFE_STAGE.DOG,
      age: AGE.MATURITY_AGE,
      position: new THREE.Vector3(8, 0, 5),
    });

    this.createDog({
      gender: GENDER.FEMALE,
      lifeStage: LIFE_STAGE.DOG,
      age: AGE.MATURITY_AGE,
      position: new THREE.Vector3(10, 0, 5),
    });

    console.log(`Created ${this.dogs.length} dogs in ${this.families.length} families`);
  }

  createFamily(daddyPos, mommyPos) {
    // Create parents
    const daddy = this.createDog({
      gender: GENDER.MALE,
      lifeStage: LIFE_STAGE.PARENT,
      age: AGE.MATURITY_AGE + 2,
      position: daddyPos,
    });

    const mommy = this.createDog({
      gender: GENDER.FEMALE,
      lifeStage: LIFE_STAGE.PARENT,
      age: AGE.MATURITY_AGE + 2,
      position: mommyPos,
    });

    // Create family
    const family = new Family(daddy, mommy);
    daddy.mate = mommy;
    mommy.mate = daddy;

    this.families.push(family);

    return family;
  }

  createDog(options) {
    const dog = new Dog(
      this.baseModel,
      this.animations,
      this.baseYOffset,
      this,
      options
    );

    this.dogs.push(dog);
    this.scene.add(dog.model);

    return dog;
  }

  spawnPuppy(family, position, gender = null) {
    const puppy = this.createDog({
      gender: gender || (Math.random() > 0.5 ? GENDER.MALE : GENDER.FEMALE),
      lifeStage: LIFE_STAGE.PUPPY,
      age: 0,
      position: position,
    });

    if (family) {
      family.addChild(puppy);
    }

    console.log(`New ${puppy.gender} puppy born!`);
    return puppy;
  }

  handleBreeding(dog1, dog2) {
    console.log(`Breeding between Dog ${dog1.id} and Dog ${dog2.id}`);

    // Determine male and female
    const male = dog1.gender === GENDER.MALE ? dog1 : dog2;
    const female = dog1.gender === GENDER.FEMALE ? dog1 : dog2;

    // If they were just dogs, they become parents now
    let family;

    if (male.lifeStage === LIFE_STAGE.DOG && female.lifeStage === LIFE_STAGE.DOG) {
      // New parents! Create family
      male.evolveToParent();
      female.evolveToParent();
      male.mate = female;
      female.mate = male;

      family = new Family(male, female);
      this.families.push(family);

      console.log('New family formed!');
    } else {
      // Existing parents breeding again
      family = male.family || female.family;
    }

    // End courtship for both
    dog1.endCourtship();
    dog2.endCourtship();

    // Spawn baby between parents
    const babyPos = new THREE.Vector3()
      .addVectors(male.model.position, female.model.position)
      .multiplyScalar(0.5);

    // Random offset
    babyPos.x += (Math.random() - 0.5) * 2;
    babyPos.z += (Math.random() - 0.5) * 2;

    this.spawnPuppy(family, babyPos);
  }

  startBabyMaker(dog1, dog2) {
    this.babyMakerActive = true;
    this.babyMakerDog1 = dog1;
    this.babyMakerDog2 = dog2;
    this.babyMakerBabies = 0;
    this.babyMakerTimer = 0;
    this.babyMakerPendingBabies = 0;

    // Start both dogs in courtship mode
    dog1.startCourtship(dog2);
    dog2.startCourtship(dog1);

    // Override normal courtship - they won't auto-breed
    dog1.courtshipTimer = -9999; // Prevent auto-completion
    dog2.courtshipTimer = -9999;

    console.log('Baby maker mode started!');

    if (this.onBabyMakerUpdate) {
      this.onBabyMakerUpdate(0);
    }
  }

  stopBabyMaker(puppyCustomizations = []) {
    if (!this.babyMakerActive) return [];

    const dog1 = this.babyMakerDog1;
    const dog2 = this.babyMakerDog2;

    // Calculate how many babies to spawn
    const babiesToSpawn = Math.max(this.babyMakerMinBabies, this.babyMakerBabies);

    // Handle breeding (creates family if needed) with customizations
    const spawnedPuppies = this.handleBreedingForBabyMaker(dog1, dog2, babiesToSpawn, puppyCustomizations);

    // End courtship for both
    dog1.endCourtship();
    dog2.endCourtship();

    this.babyMakerActive = false;
    this.babyMakerDog1 = null;
    this.babyMakerDog2 = null;

    console.log(`Baby maker stopped! Spawned ${babiesToSpawn} babies total`);

    if (this.onBabyMakerEnd) {
      this.onBabyMakerEnd(babiesToSpawn);
    }

    return spawnedPuppies;
  }

  handleBreedingForBabyMaker(dog1, dog2, totalBabies, puppyCustomizations = []) {
    // Determine male and female
    const male = dog1.gender === GENDER.MALE ? dog1 : dog2;
    const female = dog1.gender === GENDER.FEMALE ? dog1 : dog2;

    let family;

    // If they were just dogs, they become parents now
    if (male.lifeStage === LIFE_STAGE.DOG && female.lifeStage === LIFE_STAGE.DOG) {
      male.evolveToParent();
      female.evolveToParent();
      male.mate = female;
      female.mate = male;

      family = new Family(male, female);
      this.families.push(family);

      console.log('New family formed!');
    } else {
      family = male.family || female.family;
    }

    // Spawn all babies with customizations
    const spawnedPuppies = [];
    for (let i = 0; i < totalBabies; i++) {
      const babyPos = new THREE.Vector3()
        .addVectors(male.model.position, female.model.position)
        .multiplyScalar(0.5);

      // Spread babies out in a circle
      const angle = (i / totalBabies) * Math.PI * 2;
      const radius = 1 + Math.random() * 2;
      babyPos.x += Math.cos(angle) * radius;
      babyPos.z += Math.sin(angle) * radius;

      // Add some height so they fall in
      babyPos.y = 2 + Math.random() * 2;

      // Get customization for this puppy
      const customization = puppyCustomizations[i] || {};
      const gender = customization.gender === 'male' ? GENDER.MALE :
                     customization.gender === 'female' ? GENDER.FEMALE :
                     (Math.random() > 0.5 ? GENDER.MALE : GENDER.FEMALE);

      const puppy = this.spawnPuppyWithCustomization(family, babyPos, gender, customization);
      puppy.isFlying = true;
      puppy.velocity.set(0, 0, 0);
      spawnedPuppies.push(puppy);
    }

    return spawnedPuppies;
  }

  spawnPuppyWithCustomization(family, position, gender, customization = {}) {
    const puppy = this.createDog({
      gender: gender,
      lifeStage: LIFE_STAGE.PUPPY,
      age: 0,
      position: position,
      customColorTint: customization.colorTint || null,
      customName: customization.name || null,
    });

    if (family) {
      family.addChild(puppy);
    }

    console.log(`New ${puppy.gender} puppy born: ${puppy.customName || 'unnamed'}!`);
    return puppy;
  }

  updateBabyMaker(delta) {
    if (!this.babyMakerActive) return;

    this.babyMakerTimer += delta;

    // Spawn a new baby every interval (up to max)
    if (this.babyMakerTimer >= this.babyMakerSpawnInterval && this.babyMakerBabies < this.babyMakerMaxBabies) {
      this.babyMakerTimer = 0;
      this.babyMakerBabies++;

      if (this.onBabyMakerUpdate) {
        this.onBabyMakerUpdate(this.babyMakerBabies);
      }

      console.log(`Baby maker: ${this.babyMakerBabies} babies earned!`);
    }

    // Keep the dogs circling (reset their courtship timer so they don't auto-breed)
    if (this.babyMakerDog1 && this.babyMakerDog2) {
      this.babyMakerDog1.courtshipTimer = -9999;
      this.babyMakerDog2.courtshipTimer = -9999;
    }
  }

  update(delta) {
    // Update baby maker mode
    this.updateBabyMaker(delta);

    for (const dog of this.dogs) {
      dog.update(delta, this.cursorWorldPos, this.dogs);
    }
  }

  // Debug info
  getStats() {
    const stats = {
      total: this.dogs.length,
      puppies: 0,
      dogs: 0,
      parents: 0,
      males: 0,
      females: 0,
      families: this.families.length,
    };

    for (const dog of this.dogs) {
      if (dog.lifeStage === LIFE_STAGE.PUPPY) stats.puppies++;
      else if (dog.lifeStage === LIFE_STAGE.DOG) stats.dogs++;
      else stats.parents++;

      if (dog.gender === GENDER.MALE) stats.males++;
      else stats.females++;
    }

    return stats;
  }
}
