import * as THREE from 'three';

// --- CONFIGURATION ---
const PARTICLE_COUNT = 6000;
const PARTICLE_SIZE = 0.15;
const TRANSITION_DURATION = 2.0; 

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x330000); // Rich Maroon Background
scene.fog = new THREE.FogExp2(0x330000, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 40); // Slightly higher angle to see into the ingot

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- MAIN PARTICLES ---
const geometry = new THREE.BufferGeometry();
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);

// Init: Start as a scattered gold cloud
for (let i = 0; i < PARTICLE_COUNT; i++) {
    currentPositions[i * 3] = (Math.random() - 0.5) * 80;
    currentPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    currentPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0; // Gold
}
geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- FALLING COINS (Cylinders) ---
// We use InstancedMesh for performance (thousands of coins)
const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
const coinMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, 
    metalness: 1, 
    roughness: 0.3,
    emissive: 0xaa6600,
    emissiveIntensity: 0.2
});
const coinCount = 300;
const coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, coinCount);
const dummy = new THREE.Object3D();
const coinData = []; // Store speed/pos for each coin

for(let i=0; i<coinCount; i++) {
    // Random start positions
    coinData.push({
        x: (Math.random()-0.5) * 60,
        y: Math.random() * 50 + 10,
        z: (Math.random()-0.5) * 40,
        speed: 0.1 + Math.random() * 0.2,
        rotSpeed: Math.random() * 0.1
    });
}
scene.add(coinMesh);

// Add light for the coins (StandardMaterial needs light)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffd700, 2);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);


// --- SHAPE GENERATORS ---

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

// === THE GOLDEN INGOT (YUAN BAO) ===
function getIngotCoordinates() {
    const coords = [];
    const count = PARTICLE_COUNT;
    
    for (let i = 0; i < count; i++) {
        // Random distribution logic
        const u = Math.random(); 
        const v = Math.random();
        
        // 1. The Main Boat Body (Ellipsoid-ish)
        // x goes from -8 to 8
        const x = (u - 0.5) * 16;
        const z = (v - 0.5) * 8;
        
        // Shape Function: Curving up at the ends
        // Base curve: y = x^2 / 10
        const baseCurve = (x * x) / 10;
        
        // Volume thickness
        const thickness = 4 * Math.cos((z / 4) * (Math.PI / 2)); 
        
        // Check if inside the "Boat" footprint
        if (Math.abs(z) < 4) {
            // Bottom of boat
            const yBottom = baseCurve - 4;
            // Top of boat (Rim)
            const yTop = baseCurve; 

            // Fill the volume
            const y = yBottom + Math.random() * (yTop - yBottom);
            
            // Color: GOLD
            let r = 1, g = 0.84, b = 0;

            // Add a "Red Center" (Decoration on the ingot)
            if (Math.abs(x) < 1 && z > 3.5) {
                 r = 1; g = 0; b = 0; // Red dot
            }

            coords.push({x, y, z, r, g, b});
        } else {
            // Recycling unused points into a "Gold Pile" underneath
            coords.push({
                x: (Math.random()-0.5)*10,
                y: -5 - Math.random()*2,
                z: (Math.random()-0.5)*10,
                r: 1, g: 0.6, b: 0 // Darker gold
            });
        }
    }
    
    // Add the "Bump" in the middle (The gold mound)
    const moundPoints = Math.floor(count * 0.2);
    for(let i=0; i<moundPoints; i++) {
        // Sphere in the middle
        const r = 2.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = Math.abs(r * Math.sin(phi) * Math.sin(theta)) - 1; // Upper hemisphere
        const z = r * Math.cos(phi);
        
        // Overwrite some previous points
        if (coords[i]) {
            coords[i].x = x;
            coords[i].y = y;
            coords[i].z = z;
        }
    }

    return coords;
}

// --- ANIMATION ENGINE ---
let isAnimating = false, transitionStart = 0, isIngotMode = false;

function morphTo(shapeCoords) {
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        const target = shapeCoords[i % shapeCoords.length];
        
        targetPositions[pIndex * 3] = target.x; 
        targetPositions[pIndex * 3 + 1] = target.y; 
        targetPositions[pIndex * 3 + 2] = target.z;
        
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
    // 1. Text
    morphTo(getTextCoordinates("Gong Xi", 180)); await wait(2000);
    morphTo(getTextCoordinates("Fa Cai", 180)); await wait(2000);
    
    // 2. The Ingot
    morphTo(getIngotCoordinates());
    isIngotMode = true;

    // 3. Show Name
    const finalText = document.getElementById('finalText');
    finalText.innerText = "Huat Ah, " + friendName + "!";
    setTimeout(() => { finalText.style.opacity = '1'; }, 1000);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    // A. Particle Morphing
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

    // B. Ingot Rotation
    if (isIngotMode) {
        particles.rotation.y = Math.sin(time * 0.001) * 0.2; 
        
        // Animate Coins
        coinMesh.visible = true;
        for(let i=0; i<coinCount; i++) {
            const d = coinData[i];
            d.y -= d.speed;
            
            // Rotation (Flip)
            dummy.position.set(d.x, d.y, d.z);
            dummy.rotation.x += d.rotSpeed;
            dummy.rotation.z += d.rotSpeed;
            dummy.updateMatrix();
            coinMesh.setMatrixAt(i, dummy.matrix);

            // Reset coin to top
            if(d.y < -20) {
                d.y = 30;
                d.x = (Math.random()-0.5) * 60;
            }
        }
        coinMesh.instanceMatrix.needsUpdate = true;
    } else {
        coinMesh.visible = false; // Hide coins during text
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