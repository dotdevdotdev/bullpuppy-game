import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnvironment } from './environment.js';
import { DogManager } from './dogManager.js';
import { InteractionManager } from './interaction.js';
import { UI } from './ui.js';
import { DogController } from './dogController.js';

// Scene setup
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 0, 0);

// Environment (ground, lights, sky)
createEnvironment(scene);

// Dog manager
const dogManager = new DogManager(scene, camera, renderer);

// Interaction manager (pick/fling dogs)
const interactionManager = new InteractionManager(scene, camera, renderer, dogManager);

// UI (toolbar and status panel)
const ui = new UI(dogManager);

// Dog controller (third-person mode)
const dogController = new DogController(camera, controls);

// Wire up interaction -> UI
interactionManager.onDogSelected = (dog) => {
  ui.showStatusPanel(dog);
};

interactionManager.onDogDeselected = () => {
  ui.hideStatusPanel();
};

// Wire up UI -> dog controller
ui.onBecomeDog = (dog) => {
  dogController.enterDogMode(dog);
};

// Wire up dog controller exit
dogController.onExitDogMode = () => {
  // Camera will smoothly return via orbit controls
};

// Load dogs
dogManager.load().catch((err) => {
  console.error('Failed to load dogs:', err);
});

// Clock for delta time
const clock = new THREE.Clock();

// Stats display (optional)
let statsInterval = setInterval(() => {
  const stats = dogManager.getStats();
  console.log(`Population: ${stats.total} (${stats.puppies} puppies, ${stats.dogs} dogs, ${stats.parents} parents) | ${stats.families} families`);
}, 30000); // Log every 30 seconds

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update dog controller (handles player-controlled dog)
  dogController.update(delta);

  // Update interaction manager (handles physics for flung dogs)
  interactionManager.update(delta);

  // Update dogs (AI behavior)
  dogManager.update(delta);

  // Update UI (status panel refresh)
  ui.update();

  // Update controls (only if not in dog mode)
  if (!dogController.isActive) {
    controls.update();
  }

  // Render
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
animate();

console.log('Bullpuppy Family Simulation loaded!');
console.log('Click dogs to see their stats. Drag to pick up and fling!');
console.log('Use the toolbar to spawn new dogs.');
