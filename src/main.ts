import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { Noise } from 'noisejs';

import { Cube } from './cube';

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let raycaster: THREE.Raycaster;
let clock: THREE.Clock;
let controls: PointerLockControls;
let stats: Stats;
// let world: CANNON.World;
let textures: any = {};

// global settings
const cubeSize = 10;
const gravity = 9.8;

// terrain generation settings
const planeSize = 50;      // 50 x 50 cubes in the base XZ plane
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
  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

  // camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
  scene.add( controls.getObject() );
  const onKeyDown = function (event) {
    switch ( event.code ) {
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
        velocity.y = 350;
        break
    }
  };
  const onKeyUp = function (event) {
    switch ( event.code ) {
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
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

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
  controls.getObject().position.y = cubeSize * 10;

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

  // Cannon.js variables
  // world = new CANNON.World();
  // world.gravity.set(0, gravity, 0);
  // world.broadphase = new CANNON.NaiveBroadphase();
}

function createInstancedMesh(geometry, cubes, texture_name) {
  // TODO: create instanced mesh with physics
  // const cube = new CANNON.Box(new CANNON.Vec3(side, side, side));
  // const cubeBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(i + side/2, j + side/2, k + side/2) });
  // cubeBody.addShape(cube);
  // world.addBody(cubeBody);

  let materials;
  if (texture_name == 'water') {
    materials = new THREE.MeshBasicMaterial({ color: 0x1ca3ec, transparent: true, opacity: 0.2 })
  } else {
    // create materials for each face of the cubes
    materials = [
      textures[texture_name].side,
      textures[texture_name].side,
      textures[texture_name].top,
      textures[texture_name].bottom,
      textures[texture_name].side,
      textures[texture_name].side,
    ].map( text => new THREE.MeshBasicMaterial({ map: text }) );
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
    if (moveForward || moveBackward) velocity.z -= direction.z * 100.0 * delta * cubeSize;
    if (moveLeft || moveRight)       velocity.x -= direction.x * 100.0 * delta * cubeSize;

    // stop falling when on ground: base plane (stones)
    if (controls.getObject().position.y < 1.5*cubeSize) {
      // max() will stop falling but wont stop jumping
      velocity.y = Math.max(0, velocity.y);
      jumping = false;
    }

    // stop falling when on ground: grass cubes
    raycaster.ray.origin.copy(controls.getObject().position);
    const intersections = raycaster.intersectObject(meshes.grass, false);
    if (intersections.length > 0) {
      if (controls.getObject().position.y - intersections[0].point.y < cubeSize) {
        velocity.y = Math.max(0, velocity.y);
        jumping = false;
      }
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
