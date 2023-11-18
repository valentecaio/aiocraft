import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Stats from 'three/examples/jsm/libs/stats.module';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls';
import { Noise } from 'noisejs';

import { Cube } from './cube';

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let clock: THREE.Clock;
let controls: FirstPersonControls;
let stats: Stats;
let world: CANNON.World;
let textures: any = {};
let noise: Noise;

// global settings
const cubeSize = 1;
const gravity = -9.8;

// terrain generation settings
const planeSize = 50;      // 50 x 50 cubes in the plane
const noiseFactorY = 7;    // factor of terrain noise in Y direction. Bigger values create higher mountains
const noiseFactorXZ = 20;  // factor of terrain noise in X and Z directions. Bigger values create more variation in terrain
const noiseFactorAdd = 5;  // bigger values mean higher terrain
const waterLevel = 3       // empty space below this level is water

// global game state
let state = {
  grass: [],
  stone: [],
  water: [],
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

  // camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  scene.add(new THREE.CameraHelper(camera));
  camera.position.y = 5;
  camera.position.z = 50;
  camera.position.x = 50;

  // lights
  scene.add(new THREE.AmbientLight(0xffffff));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // controls
  controls = new FirstPersonControls(camera, renderer.domElement);
  controls.lookSpeed = 0.4;
  controls.movementSpeed = 10;

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
    water: {
      top:    textureLoader.load('textures/v1/water.png'),
      side:   textureLoader.load('textures/v1/water.png'),
      bottom: textureLoader.load('textures/v1/water.png'),
    },
  };

  // Cannon.js variables
  world = new CANNON.World();
  world.gravity.set(0, gravity, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
}

function createCube(i, j, k, side, texture, transparent) {
  // TODO: create cube with physics
  const cube = new CANNON.Box(new CANNON.Vec3(side, side, side));
  const cubeBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(i + side/2, j + side/2, k + side/2) });
  cubeBody.addShape(cube);
  world.addBody(cubeBody);

  const materials = [
    texture.side,
    texture.side,
    texture.top,
    texture.bottom,
    texture.side,
    texture.side,
  ].map(texture => new THREE.MeshBasicMaterial({ map: texture }));
  // {map: texture, transparent: true, opacity: transparent ? 0.3 : 1}

  const cubeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(side, side, side),
    materials
  );
  cubeMesh.position.set(i, j, k);
  scene.add(cubeMesh);
}

function createInstancedMesh(geometry, cubes, texture, transparent = false) {
  // TODO: create instanced mesh with physics

  // create materials for each face of the cubes
  const materials = [
    texture.side,
    texture.side,
    texture.top,
    texture.bottom,
    texture.side,
    texture.side,
  ].map(text => {
    if (transparent) {
      return new THREE.MeshBasicMaterial({ map: text, transparent: true, opacity: 0.3 })
    } else {
      return new THREE.MeshBasicMaterial({ map: text })
    }
  });
  const mesh = new THREE.InstancedMesh(geometry, materials, cubes.length);

  // set position of each cube
  cubes.forEach((cube, cube_index) => {
    const matrix = new THREE.Matrix4().setPosition(cube.x, cube.y, cube.z);
    mesh.setMatrixAt(cube_index, matrix);
  });
  scene.add(mesh);
}

function createWorld() {
  noise = new Noise(Date.now() % 65536);

  for (let i = 0; i < planeSize; i += cubeSize) {
    for (let j = 0; j < planeSize; j += cubeSize) {
      // base floor: stone
      state.stone.push(new Cube(i, 0, j))

      // use noise to create random height of cubes
      const height = Math.floor(noise.perlin2(i/noiseFactorXZ, j/noiseFactorXZ) * noiseFactorY) + noiseFactorAdd;

      // create grass cubes
      for (let k = 1; k < height; k++) {
        state.grass.push(new Cube(i, k, j))
      }

      // fill bottom with water
      for (let k = Math.max(height, 1); k < waterLevel; k++) {
        state.water.push(new Cube(i, k, j))
      }
    }
  }

  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  createInstancedMesh(geometry, state.stone, textures.stone);
  createInstancedMesh(geometry, state.grass, textures.grass);
  createInstancedMesh(geometry, state.water, textures.water, true);
}

// animation loop
function animate () {
  // requestAnimationFrame(animate);

  // Update physics
  world.step(1 / 60);

  // Update controls
  const delta = clock.getDelta();
  controls.update(delta);

  // Render scene
  stats.update();
  renderer.render(scene, camera);
};

init();
createWorld();
