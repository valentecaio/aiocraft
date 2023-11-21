import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { Noise } from 'noisejs';

import { Cube } from './cube';

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let raycasterFloor: THREE.Raycaster;
let raycasterMouse: THREE.Raycaster;
let clock: THREE.Clock;
let controls: PointerLockControls;
let stats: Stats;
// let world: CANNON.World;
let textures: any = {};

// global settings and hacks
const cubeSize = 10;     // scale of cubes
const gravity = 9.8;     // how fast the player falls
const jumpFactor = 350;  // how high the player jumps
const speed = 300;       // how fast the player moves
const fly = true;       // whether the player can fly

// terrain generation settings
const planeSize = 90;     // size of the base XZ plane
const noiseFactorY = 7;    // factor of terrain noise in Y direction. Bigger values create higher mountains
const noiseFactorXZ = 20;  // factor of terrain noise in X and Z directions. Bigger values create more variation in terrain
const noiseFactorAdd = 5;  // bigger values mean higher terrain
const waterLevel = 3       // empty spaces below this Y are water

// terrain state
let cubes = {
  grass: [],
  stone: [],
  water: [],
};
let meshes = {
  grass: THREE.InstancedMesh,
  stone: THREE.InstancedMesh,
  water: THREE.InstancedMesh,
};

// movement
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let jumping = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// move and jump
function onKeyDown(event) {
  if (controls.isLocked === false) return;
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (jumping) return;
      jumping = true;
      velocity.y = jumpFactor;
      break
  }
};

function onKeyUp(event) {
  if (controls.isLocked === false) return;
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
};

// on left click, cast a ray and remove the cube that was hit
function onClick(event) {
  if (controls.isLocked === false) return;
  event.preventDefault();
  // (0,0) is the center of the screen
  raycasterMouse.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersection = raycasterMouse.intersectObject(meshes.grass);
  if (intersection.length > 0) {
    deleteInstanceFromMesh(meshes.grass, intersection[0].instanceId);
  }
};


function init() {
  // Three.js variables
  stats = new Stats();
  document.body.appendChild(stats.dom);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7cd1e9); // clear sky blue

  clock = new THREE.Clock();
  raycasterFloor = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);
  raycasterMouse = new THREE.Raycaster();

  // camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 700);
  camera.position.y = 5;
  camera.position.z = 50;
  camera.position.x = 50;
  // scene.add(new THREE.CameraHelper(camera));

  // lights
  scene.add(new THREE.AmbientLight(0xffffff));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // controls
  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('click', onClick);

  // basic instructions screen
  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');
  const aimpointer = document.getElementById('aimpointer');
  aimpointer.style.display = 'none';
  instructions.addEventListener('click', function () {
    controls.lock();
  });
  controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
    aimpointer.style.display = '';
  });
  controls.addEventListener('unlock', function () {
    instructions.style.display = '';
    blocker.style.display = 'block';
    aimpointer.style.display = 'none';
  });

  // initial position of the player
  controls.getObject().position.x = cubeSize * planeSize / 2;
  controls.getObject().position.z = cubeSize * planeSize / 2;
  controls.getObject().position.y = cubeSize * 15;

  // window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // textures
  const textureLoader = new THREE.TextureLoader();
  textures = {
    grass: {
      top:    textureLoader.load('textures/v2/grass1.png'),
      side:   textureLoader.load('textures/v2/grass2.png'),
      bottom: textureLoader.load('textures/v2/grass3.png'),
    },
    stone: {
      top:    textureLoader.load('textures/v1/stone_dark.png'),
      side:   textureLoader.load('textures/v1/stone_dark.png'),
      bottom: textureLoader.load('textures/v1/stone_dark.png'),
    },
  };
}

function deleteInstanceFromMesh(instancedMesh, instanceId) {
  for (let i = instanceId; i < instancedMesh.count - 1; i++) {
    const matrix = new THREE.Matrix4();
    instancedMesh.getMatrixAt(i + 1, matrix);
    instancedMesh.setMatrixAt(i, matrix);
  }
  instancedMesh.count--;
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function createInstancedMesh(geometry, cubes, texture_name) {
  let materials;
  if (texture_name == 'water') {
    materials = new THREE.MeshBasicMaterial({color: 0x1ca3ec, transparent: true, opacity: 0.2})
  } else {
    // create materials for each face of the cubes
    materials = [
      textures[texture_name].side,
      textures[texture_name].side,
      textures[texture_name].top,
      textures[texture_name].bottom,
      textures[texture_name].side,
      textures[texture_name].side,
    ].map(text => new THREE.MeshBasicMaterial({map: text}));
  }
  const mesh = new THREE.InstancedMesh(geometry, materials, cubes.length);

  // set position of each cube
  cubes.forEach((cube, cube_index) => {
    const matrix = new THREE.Matrix4().setPosition(cube.x, cube.y, cube.z);
    mesh.setMatrixAt(cube_index, matrix);
  });
  scene.add(mesh);
  return mesh
}

function createWorld() {
  const noise = new Noise(Date.now() % 65536);

  for (let i = 0; i < planeSize; i++) {
    for (let k = 0; k < planeSize; k++) {
      // base floor plane: stone
      cubes.stone.push(new Cube(i*cubeSize, 0, k*cubeSize));
      // use noise to create hills of random height
      const height = Math.floor(noise.perlin2(i/noiseFactorXZ, k/noiseFactorXZ) * noiseFactorY) + noiseFactorAdd;
      // build hills of grass cubes
      for (let j = 1; j < height; j++) {
        cubes.grass.push(new Cube(i*cubeSize, j*cubeSize, k*cubeSize));
      }
      // fill bottom of valleys with water
      for (let j = Math.max(height, 1); j < waterLevel; j++) {
        cubes.water.push(new Cube(i*cubeSize, j*cubeSize, k*cubeSize));
      }
    }
  }
  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  meshes.stone = createInstancedMesh(geometry, cubes.stone, 'stone');
  meshes.water = createInstancedMesh(geometry, cubes.water, 'water');
  meshes.grass = createInstancedMesh(geometry, cubes.grass, 'grass');
}

// animation loop
function animate () {
  // requestAnimationFrame(animate);

  // Update physics
  // world.step(1 / 60);

  // Update controls and physics
  if (controls.isLocked === true) {
    // update movement direction
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    const delta = clock.getDelta();

    // inertia and gravity
    velocity.x -= velocity.x * 20.0 * delta;
    velocity.z -= velocity.z * 20.0 * delta;
    velocity.y -= gravity * 100.0 * delta; // 100.0 = mass

    // update movement speed
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta * cubeSize;
    if (moveLeft || moveRight)       velocity.x -= direction.x * speed * delta * cubeSize;

    // stop falling when on ground: base plane (stones)
    if (controls.getObject().position.y < 1.5*cubeSize) {
      // max() will stop falling but wont stop jumping
      velocity.y = Math.max(0, velocity.y);
      jumping = false;
    }

    // stop falling when on ground: grass cubes
    raycasterFloor.ray.origin.copy(controls.getObject().position);
    const intersections = raycasterFloor.intersectObject(meshes.grass, false);
    if (intersections.length > 0) {
      if (controls.getObject().position.y - intersections[0].point.y < cubeSize) {
        velocity.y = Math.max(0, velocity.y);
        jumping = false;
      }
    }

    // fly hack
    if (fly) {
      velocity.y = Math.max(0, velocity.y);
    }

    // move
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += (velocity.y * delta);
  }

  // Render scene
  stats.update();
  renderer.render(scene, camera);
};

init();
createWorld();
