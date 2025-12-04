import * as THREE from 'three';

export function createEnvironment(scene) {
  // Sky background - soft gradient blue
  scene.background = new THREE.Color(0x87CEEB);

  // Add fog for atmosphere
  scene.fog = new THREE.Fog(0x87CEEB, 30, 100);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x7cba5f,
    roughness: 0.8,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Ambient light - soft fill
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Hemisphere light - sky/ground color variation
  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7cba5f, 0.4);
  scene.add(hemiLight);

  // Directional light - sun
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  sunLight.position.set(50, 50, 50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 200;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  scene.add(sunLight);

  return { ground, sunLight };
}
