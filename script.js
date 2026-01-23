import * as THREE from 'three';

// --- CONFIGURATION ---
const PARTICLE_COUNT = 6500; // Increased for Lion detail
const PARTICLE_SIZE = 0.12;
const TRANSITION_DURATION = 2.0; 

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0000); // Very dark red night
scene.fog = new THREE.FogExp2(0x1a0000, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- MAIN PARTICLES ---
const geometry = new THREE.BufferGeometry();
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);

// Initialize scattered positions
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * 80;
    const y = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    currentPositions[i * 3] = x; currentPositions[i * 3 + 1] = y; currentPositions[i * 3 + 2] = z;
    colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0; // Start Gold
}
geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- ANGPAO RAIN (Falling Red Squares) ---
const angpaoGeo = new THREE.BufferGeometry();
const angpaoCount = 200; // Number of falling angpaos
const angpaoPos = new Float32Array(angpaoCount * 3);
for(let i=0; i<angpaoCount*3; i+=3) {
    angpaoPos[i] = (Math.random()-0.5) * 60; // x
    angpaoPos[i+1] = Math.random() * 40 + 10; // y (Start high)
    angpaoPos[i+2] = (Math.random()-0.5) * 30; // z
}
angpaoGeo.setAttribute('position', new THREE.BufferAttribute(angpaoPos, 3));

// Use a large square point for Angpao
const angpaoMat = new THREE.PointsMaterial({ 
    size: 1.5, // Look like rectangles
    color: 0xff0000, 
    opacity: 0, // Start invisible
    transparent: true 
});
const angpaoMesh = new THREE.Points(angpaoGeo, angpaoMat);
scene.add(angpaoMesh);

// --- FIREWORKS ---
const fireworkGeo = new THREE.BufferGeometry();
const fireworkCount = 800;
const fireworkPos = new Float32Array(fireworkCount * 3);
const fireworkVel = []; // Store velocities
for(let i=0; i<fireworkCount; i++) {
    fireworkPos[i*3] = 0; fireworkPos[i*3+1] = -50; fireworkPos[i*3+2] = 0; // Hide initially
    fireworkVel.push({x:0, y:0, z:0, active: false});
}
fireworkGeo.setAttribute('position', new THREE.BufferAttribute(fireworkPos, 3));
const fireworkMat = new THREE.PointsMaterial({ size: 0.4, color: 0xffd700, transparent: true, opacity: 1 });
const fireworkMesh = new THREE.Points(fireworkGeo, fireworkMat);
scene.add(fireworkMesh);


// --- SHAPE GENERATORS ---

// 1. Text Scanner
function getTextCoordinates(text, fontSize = 100) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 1024;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const coords = [];
    const step = 4; 
    for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
            if (data[(y * canvas.width + x) * 4] > 128) {
                coords.push({ x: (x - canvas.width/2) * 0.06, y: -(y - canvas.height/2) * 0.06, z: 0 });
            }
        }
    }
    return coords;
}

// 2. LION HEAD GENERATOR (Geometric Composition)
function getLionCoordinates() {
    const coords = [];
    const count = PARTICLE_COUNT;
    
    for (let i = 0; i < count; i++) {
        // Random point generator for volume filling
        const u = Math.random(); const v = Math.random();
        const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * 6; // Base radius 6
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        // A. RED FACE (Main Sphere)
        if (z < 2) { 
            coords.push({x, y, z: z-2, r: 1, g: 0.1, b: 0.1}); // Red
            continue;
        }

        // B. EYES (White Spheres)
        if (y > 1 && Math.abs(x) > 1.5 && Math.abs(x) < 4.5 && z > 2) {
             coords.push({x, y: y+1, z: z+2, r: 1, g: 1, b: 1}); // White
             continue;
        }

        // C. PUPILS (Black dots in eyes)
        if (y > 2 && Math.abs(x) > 2.5 && Math.abs(x) < 3.5 && z > 4) {
             coords.push({x, y: y+1, z: z+2.5, r: 0, g: 0, b: 0}); // Black
             continue;
        }

        // D. GOLDEN HORN (Top Cone)
        if (y > 4 && Math.abs(x) < 1.5) {
             coords.push({x: x*0.5, y: y+3, z: z, r: 1, g: 0.8, b: 0}); // Gold
             continue;
        }

        // E. BEARD (White falling particles)
        if (y < -3) {
             coords.push({x: x*1.2, y: y-Math.random()*4, z: z, r: 0.9, g: 0.9, b: 0.9}); // White/Grey
             continue;
        }

        // Default: Red Face border
        coords.push({x, y, z, r: 1, g: 0.1, b: 0.1});
    }
    return coords;
}

// --- ANIMATION ENGINE ---
let isAnimating = false, transitionStart = 0, isLionMode = false;

function morphTo(shapeCoords) {
    // Shuffle
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        const target = shapeCoords[i % shapeCoords.length];
        
        targetPositions[pIndex * 3] = target.x; 
        targetPositions[pIndex * 3 + 1] = target.y; 
        targetPositions[pIndex * 3 + 2] = target.z;
        
        // Colors
        const r = target.r !== undefined ? target.r : 1; 
        const g = target.g !== undefined ? target.g : 0.8; 
        const b = target.b !== undefined ? target.b : 0;
        colors[pIndex * 3] = r; colors[pIndex * 3 + 1] = g; colors[pIndex * 3 + 2] = b;
    }
    geometry.attributes.color.needsUpdate = true;
    transitionStart = performance.now();
    isAnimating = true;
}

// --- TIMELINE ---
const urlParams = new URLSearchParams(window.location.search);
const friendName = urlParams.get('name') || "Friend";

async function runShow() {
    // 1. Countdown
    morphTo(getTextCoordinates("3", 350)); await wait(1500);
    morphTo(getTextCoordinates("2", 350)); await wait(1500);
    morphTo(getTextCoordinates("1", 350)); await wait(1500);
    
    // 2. Greeting
    morphTo(getTextCoordinates("Gong Xi", 180)); await wait(1500);
    morphTo(getTextCoordinates("Fa Cai", 180)); await wait(1500);
    
    // 3. Lion Dance Finale
    morphTo(getLionCoordinates());
    isLionMode = true;

    // 4. Trigger Angpao Rain & Fireworks
    angpaoMat.opacity = 1; 
    
    // 5. Final Text
    const finalText = document.getElementById('finalText');
    finalText.innerText = "Happy CNY, " + friendName;
    setTimeout(() => { finalText.style.opacity = '1'; }, 1000);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    // A. Morphing
    if (isAnimating) {
        const progress = Math.min((time - transitionStart) / (TRANSITION_DURATION * 1000), 1);
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i*3, iy = i*3+1, iz = i*3+2;
            pos[ix] += (targetPositions[ix] - pos[ix]) * 0.08;
            pos[iy] += (targetPositions[iy] - pos[iy]) * 0.08;
            pos[iz] += (targetPositions[iz] - pos[iz]) * 0.08;
        }
        geometry.attributes.position.needsUpdate = true;
        if (progress >= 1) isAnimating = false;
    }

    // B. Lion Mode Animation
    if (isLionMode) {
        // 1. Bobbing Head (Lion Dance movement)
        particles.rotation.y = Math.sin(time * 0.002) * 0.2; 
        particles.rotation.z = Math.cos(time * 0.003) * 0.05; 
        
        // 2. Angpao Rain
        const apos = angpaoGeo.attributes.position.array;
        for(let i=1; i<angpaoCount*3; i+=3) {
            apos[i] -= 0.15; // Fall speed
            if(apos[i] < -25) { // Reset to top
                apos[i] = 30;
                apos[i-1] = (Math.random()-0.5) * 60; // Random X
            }
        }
        angpaoGeo.attributes.position.needsUpdate = true;

        // 3. Fireworks
        const fpos = fireworkGeo.attributes.position.array;
        for(let i=0; i<fireworkCount; i++) {
            const v = fireworkVel[i];
            // If active, move
            if(v.active) {
                fpos[i*3] += v.x; fpos[i*3+1] += v.y; fpos[i*3+2] += v.z;
                v.y -= 0.005; // Gravity
                v.active = Math.random() > 0.02; // Chance to die
            } else if(Math.random() < 0.01) { // Chance to respawn
                fpos[i*3] = (Math.random()-0.5)*40; 
                fpos[i*3+1] = (Math.random()-0.5)*40; 
                fpos[i*3+2] = -10;
                // Explode out
                v.x = (Math.random()-0.5)*0.5; v.y = (Math.random()-0.5)*0.5; v.z = (Math.random()-0.5)*0.5;
                v.active = true;
            }
        }
        fireworkGeo.attributes.position.needsUpdate = true;
    } 

    renderer.render(scene, camera);
}
animate();

// --- EVENTS ---
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('overlay').remove(), 1000);
    document.getElementById('music').play().catch(e => console.log(e));
    runShow();
});
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});