import * as THREE from "three";
import * as Tone from "tone";
import { Noise } from "noisejs";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";
import { Envelope, Filter, SyncedSignal } from "tone";

let scene, camera, renderer;
let geometry, material, cube;
let colour, intensity, light;
let ambientLight;

let orbit;

let clock, delta, interval;

let numMovers, movers, synths;
let musicalScale;

let size = 35;
let divisions = 35;

let startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

function init() {
  //alert("We have initialised!")
  //remove overlay
  let overlay = document.getElementById("overlay");
  overlay.remove();

  //creates clock to clamp operations to differant timed rates
  clock = new THREE.Clock();
  delta = 0;
  interval = 1 / 2; //2fps
  //create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x474c4f);

  //create camera
  camera = new THREE.PerspectiveCamera(
    75, //fov
    window.innerWidth / window.innerHeight, //aspect
    0.1, //near
    1000 //far
  );
  camera.position.z = 25;
  //specify our render and add it to our document
  renderer = new THREE.WebGL1Renderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  //create the orbit controls instace so we can use the mouse to move around our scene
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  let gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper);

  numMovers = 36;
  movers = [];
  synths = [];
  musicalScale = [0, 4, 7, 11, 14];

  for (let i = 0; i < numMovers; i++) {
    let octave = parseInt(i / 12, 10); //find our octave based on where we're at with our iteration of "i"
    let freq = 36 + (musicalScale[i % 5] + octave * 12); //starting from base 36 (C2) pick a value to add from our muscialScale array then increase our octave to spread our scale
    synths.push(
      new Tone.MonoSynth({
        //add a new synth to our array
        oscillator: {
          type: "sawtooth"
        },
        envelope: {
          attack: 0.01
        }
      })
    );
    synths[i].toDestination(); //connect our synth to the main output
    synths[i].triggerAttack(
      Tone.Frequency(freq, "midi") + Math.random(6),
      0,
      0.01
    ); //trigger at our desired frequency with a bit of randomness to add "thickness" to the sound
    for (let j = 0; j < numMovers / 2; j++) {
      movers.push([]);
      movers[i].push(new Mover(i - 17, 0, j - 8, i * 0.25));
    }
    //for (let j = 0; j < numMovers / 2; j++) {
    //movers.push([]);
    //movers[i].push(new Mover(i - 10, 0, j - 5, i * 0.25));
  }

  play();
  //lighting
  colour = 0xffffff;
  intensity = 1;
  light = new THREE.DirectionalLight(colour, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
}
//start animating
function play() {
  //using the new set animationloop method which means we are webxr ready if need be
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

class Mover {
  constructor(x, y, z, offset) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.angle = new THREE.Vector3(0, offset, 0);
    this.velocity = new THREE.Vector3(0.1, 0.01, 0.01);
    this.amplitude = new THREE.Vector3(0.5, 2.5, 0.5);
    this.geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(
        THREE.MathUtils.randInt(0, 1),
        THREE.MathUtils.randInt(0, 1),
        THREE.MathUtils.randInt(0, 1)
      )
    });
    this.box = new THREE.Mesh(this.geo, this.mat);
    this.box.position.set(this.x, this.y, this.z);
    this.noise = new Noise();
    scene.add(this.box);
  }
  update() {
    this.angle.add(this.velocity);
    this.y = Math.sin(this.angle.y) * this.amplitude.y;
    let perl = this.noise.perlin2(this.angle.y, this.amplitude.y) * 5;
    this.angle.add(this.velocity);
    this.y = Math.sin(this.angle.y) * this.amplitude.y + perl;
  }
  display() {
    this.box.position.set(this.x, this.y, this.z);
  }
}

//update function
function update() {
  orbit.update();
  //update in here
  delta += clock.getDelta();

  for (let i = 0; i < numMovers; i++) {
    let boxPosMap = THREE.MathUtils.mapLinear(
      //map the movers box position from world coords to between -1 and 1
      movers[i][0].box.position.y,
      -movers[i][0].amplitude.y / 10,
      movers[i][0].amplitude.y,
      -1,
      1
    );
    let boxPosMapClamp = THREE.MathUtils.clamp(boxPosMap, 0, 3); //ensure our newly mapped value never goes above 3 or below 0
    let boxPosGainTodB = Tone.gainToDb(boxPosMapClamp); //convert our mapped and constrained value to decibels
    synths[i].volume.linearRampTo(boxPosGainTodB, 0.01); //set the volume of our synth with the correctly calibrated value mapped from the box position
    for (let j = 0; j < numMovers / 2; j++) {
      //update our movers
      movers[i][j].update();
    }
  }

  if (delta > interval) {
    //the draw or time dependent code are here
    delta = delta % interval;
  }
}

//simple render function
function render() {
  for (let i = 0; i < numMovers; i++) {
    for (let j = 0; j < numMovers / 2; j++) {
      movers[i][j].display();
    }
  }
  renderer.render(scene, camera);
}

//stop animating (not currentky used)
function stop() {
  renderer.setAnimationLoop(null);
}
