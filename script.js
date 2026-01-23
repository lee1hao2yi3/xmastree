import * as THREE from 'three';

// --- CONFIGURATION ---
const PARTICLE_COUNT = 5500; 
const PARTICLE_SIZE = 0.15;
const TRANSITION_DURATION = 2.0; 

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a0000); // Dark Red Background
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- PARTICLES ---
const geometry = new THREE.BufferGeometry();
const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);

// Init random positions (Gold dust)
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    initialPositions[i * 3] = x; initialPositions[i * 3 + 1] = y; initialPositions[i * 3 + 2] = z;
    currentPositions[i * 3] = x; currentPositions[i * 3 + 1] = y; currentPositions[i * 3 + 2] = z;
    colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0; // Gold
}
geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- FIREWORKS (Instead of Snow) ---
const fireworkGeo = new THREE.BufferGeometry();
const fireworkCount = 1000;
const fireworkPos = new Float32Array(fireworkCount * 3);
for(let i=0; i<fireworkCount*3; i++) fireworkPos[i] = (Math.random()-0.5) * 100; // Far away
fireworkGeo.setAttribute('position', new THREE.BufferAttribute(fireworkPos, 3));
const fireworkMat = new THREE.PointsMaterial({ size: 0.3, color: 0xffd700, transparent: true, opacity: 0 });
const fireworkMesh = new THREE.Points(fireworkGeo, fireworkMat);
scene.add(fireworkMesh);

// --- GENERATORS ---
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

// === NEW: LANTERN SHAPE ===
function getLanternCoordinates() {
    const coords = [];
    
    // 1. Lantern Body (Sphere-ish) - 70%
    const bodyCount = Math.floor(PARTICLE_COUNT * 0.7);
    for (let i = 0; i < bodyCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        let radius = 6;
        // Flatten the sphere slightly at top/bottom to make it lantern shaped
        let y = radius * Math.cos(phi) * 1.2; 
        let x = radius * Math.sin(phi) * Math.cos(theta);
        let z = radius * Math.sin(phi) * Math.sin(theta);

        // Color: RED (1, 0, 0)
        coords.push({ x, y, z, r: 1, g: 0.1, b: 0.1 });
    }

    // 2. Top & Bottom Rims (Gold Rings) - 10%
    const rimCount = Math.floor(PARTICLE_COUNT * 0.1);
    for (let i = 0; i < rimCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 3.5; // Width of rim
        const isTop = Math.random() > 0.5;
        const y = isTop ? 6 : -6;
        
        coords.push({ 
            x: Math.cos(angle)*r, y: y, z: Math.sin(angle)*r, 
            r: 1, g: 0.8, b: 0 
        }); // GOLD
    }

    // 3. The Tassel (Falling Lines at bottom) - 20%
    const tasselCount = PARTICLE_COUNT - coords.length;
    for (let i = 0; i < tasselCount; i++) {
        const y = -6 - (Math.random() * 8); // Hanging down
        const width = 1.5 * (1 - (Math.abs(y)-6)/8); // Taper slightly
        const x = (Math.random()-0.5) * width;
        const z = (Math.random()-0.5) * width;

        coords.push({ x, y, z, r: 1, g: 0.8, b: 0 }); // GOLD
    }

    return coords;
}

// --- ANIMATION ENGINE ---
let isAnimating = false, transitionStart = 0, isLanternMode = false;

function morphTo(shapeCoords) {
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        const target = shapeCoords[i % shapeCoords.length];
        targetPositions[pIndex * 3] = target.x; targetPositions[pIndex * 3 + 1] = target.y; targetPositions[pIndex * 3 + 2] = target.z;
        const r = target.r !== undefined ? target.r : 1; const g = target.g !== undefined ? target.g : 0.8; const b = target.b !== undefined ? target.b : 0;
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
    
    // 3. The Lantern
    morphTo(getLanternCoordinates());
    isLanternMode = true;

    // 4. Show Name
    const finalText = document.getElementById('finalText');
    finalText.innerText = "Happy CNY, " + friendName;
    setTimeout(() => { finalText.style.opacity = '1'; }, 1000);
    
    // 5. Start Fireworks
    startFireworks();
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- FIREWORKS LOGIC ---
function startFireworks() {
    let opacity = 0;
    const fadeIn = setInterval(() => {
        opacity += 0.05; fireworkMat.opacity = opacity;
        if(opacity >= 1) clearInterval(fadeIn);
    }, 100);
}

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    
    // Morphing
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

    // Idle Animation
    if (isLanternMode) {
        particles.rotation.y = Math.sin(time * 0.001) * 0.2; // Gentle swing
        
        // Fireworks Explode/Reset
        const fp = fireworkGeo.attributes.position.array;
        for(let i=0; i<fireworkCount; i++) {
            const ix = i*3, iy = i*3+1, iz = i*3+2;
            fp[iy] += 0.1; // Rise up
            if(fp[iy] > 40 || Math.random() < 0.001) { // Reset
                fp[ix] = (Math.random()-0.5) * 80;
                fp[iy] = -30;
                fp[iz] = (Math.random()-0.5) * 40 - 20; 
            }
        }
        fireworkGeo.attributes.position.needsUpdate = true;
    } else {
        particles.rotation.y = Math.sin(time * 0.001) * 0.1;
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