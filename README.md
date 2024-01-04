## AioCraft

Try it at [valentecaio.ovh/aiocraft](https://valentecaio.ovh/aiocraft/).

![screenshot1.png](https://github.com/valentecaio/aiocraft/blob/main/.github/screenshot1.png?raw=true)

AioCraft is a first-person game built with the Three.js library. It uses GPU instancing to render a scene composed of texels (cubes) which are randomly generated from a Perlin noise function. The collision and gravity are handled using the native ray tracing Three.js module.

For more information, see [this presentation](.github/aiocraft.pdf) (in Portuguese) ot [this demonstration video](.github/video1.mp4).

---
### Controls

Keys | Function
|--|--|
WASD | Walk
Space | Jump
Mouse | Camera control
R | FPS show on/off
F | Gravity on/off
Up/Down | Teleport vertically
Left/Right | Increase/decrease movement speed

---
### How to execute
To run this project locally, follow the steps below.
1. Install Node.js from [nodejs.org](https://nodejs.org).
2. Install the dependencies: `$ npm install`
3. Run the node server: `$ npm run dev`
4. Access the application at [localhost:5173](http://localhost:5173) in a browser.

---
### Different types of terrain
The terrain generation method can be easily adapted to generate different types of terrain, such as the examples below:

![screenshot2.png](https://github.com/valentecaio/aiocraft/blob/main/.github/screenshot2.png?raw=true)

![screenshot3.png](https://github.com/valentecaio/aiocraft/blob/main/.github/screenshot3.png?raw=true)
