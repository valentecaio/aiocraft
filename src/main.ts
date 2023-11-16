import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let stats: Stats;
let world: CANNON.World;

function init() {
  // Three.js variables
  stats = new Stats();
  document.body.appendChild(stats.dom);
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  scene.add(new THREE.CameraHelper(camera));
  camera.position.y = 5;
  camera.position.z = 5;

  // lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // controls
  controls = new OrbitControls(camera, renderer.domElement);
  // controls.enableDamping = true; // an animation loop is required for this to work
  controls.screenSpacePanning = false;
  controls.listenToKeyEvents( window );
  controls.keys = { UP: 'KeyW', LEFT: 'KeyA', BOTTOM: 'KeyS', RIGHT: 'KeyD' };
  console.log(controls)

  // window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Cannon.js variables
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.NaiveBroadphase();

  // create floor of cubes
  const planeSize = 20;
  const cubeSize = 1;
  const halfPlaneSize = planeSize / 2;
  const halfCubeSize = cubeSize / 2;

  for (let i = -halfPlaneSize; i < halfPlaneSize; i += cubeSize) {
    for (let j = -halfPlaneSize; j < halfPlaneSize; j += cubeSize) {
      const cube = new CANNON.Box(new CANNON.Vec3(cubeSize / 2, cubeSize / 2, cubeSize / 2));
      const cubeBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(i + halfCubeSize, halfCubeSize, j + halfCubeSize) });
      cubeBody.addShape(cube);
      world.addBody(cubeBody);

      const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cubeMesh = new THREE.Mesh(geometry, material);
      cubeMesh.position.set(i, halfCubeSize, j);
      scene.add(cubeMesh);
    }
  }
}

init();

// Set up animation loop
const animate = () => {
  requestAnimationFrame(animate);

  // Update physics
  world.step(1 / 60);

  // Update controls
  controls.update();

  // Render scene
  stats.update();
  renderer.render(scene, camera);
};

animate();