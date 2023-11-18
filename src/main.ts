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

// global settings
const cubeSize = 1;
const gravity = -9.8;

// terrain generation settings
const planeSize = 50;      // 50 x 50 cubes in the base plane XZ
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

function createInstancedMesh(geometry, cubes, texture_name) {
  // TODO: create instanced mesh with physics

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
}

function createWorld() {
  const noise = new Noise(Date.now() % 65536);

  for (let i = 0; i < planeSize; i += cubeSize) {
    for (let k = 0; k < planeSize; k += cubeSize) {
      // base floor plane: stone
      state.stone.push(new Cube(i, 0, k))

      // use noise to create hills of random height
      const height = Math.floor(noise.perlin2(i/noiseFactorXZ, k/noiseFactorXZ) * noiseFactorY) + noiseFactorAdd;

      // build hills of grass cubes
      for (let j = 1; j < height; j++) {
        state.grass.push(new Cube(i, j, k))
      }

      // fill bottom of valleys with water
      for (let j = Math.max(height, 1); j < waterLevel; j++) {
        state.water.push(new Cube(i, j, k))
      }
    }
  }

  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  createInstancedMesh(geometry, state.stone, 'stone');
  createInstancedMesh(geometry, state.grass, 'grass');
  createInstancedMesh(geometry, state.water, 'water');
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
