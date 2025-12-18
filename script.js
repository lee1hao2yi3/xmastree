import * as THREE from 'three';

// --- CONFIGURATION ---
const PARTICLE_COUNT = 6000; // Increased for better detail
const PARTICLE_SIZE = 0.12;
const TRANSITION_DURATION = 2.0; 

// --- 1. SETUP SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205); // Deep night blue

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35); // Start closer

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- 2. MAIN MORPHING PARTICLES ---
const geometry = new THREE.BufferGeometry();
const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const currentPositions = new Float32Array(PARTICLE_COUNT * 3); // To store current state

// Initialize random scattered positions
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    
    initialPositions[i * 3] = x; initialPositions[i * 3 + 1] = y; initialPositions[i * 3 + 2] = z;
    currentPositions[i * 3] = x; currentPositions[i * 3 + 1] = y; currentPositions[i * 3 + 2] = z;
    
    colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
}

geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Glowing Dot Material
const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- 3. SEPARATE SNOW SYSTEM (Falls only when tree appears) ---
const snowGeo = new THREE.BufferGeometry();
const snowCount = 2000;
const snowPos = new Float32Array(snowCount * 3);
for(let i=0; i<snowCount*3; i++) snowPos[i] = (Math.random()-0.5) * 50;
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({ size: 0.2, color: 0xffffff, transparent: true, opacity: 0 }); // Start invisible
const snowMesh = new THREE.Points(snowGeo, snowMat);
scene.add(snowMesh);


// --- 4. SHAPE GENERATORS ---

// A. Text Scanner
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
    const step = 4; // Check every 4th pixel
    for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
            if (data[(y * canvas.width + x) * 4] > 128) {
                coords.push({
                    x: (x - canvas.width/2) * 0.06,
                    y: -(y - canvas.height/2) * 0.06,
                    z: 0
                });
            }
        }
    }
    return coords;
}

// B. The Detailed Tree Generator
function getDetailedTreeCoordinates() {
    const coords = [];
    
    // 1. The Leaves (Cone Spiral) - 70% of particles
    const leafCount = Math.floor(PARTICLE_COUNT * 0.7);
    for (let i = 0; i < leafCount; i++) {
        const t = i / leafCount;
        const angle = t * Math.PI * 60; // More spirals
        const radius = 7 * (1 - t); 
        const height = (t * 14) - 5; // -5 to +9

        let r = 0.2, g = 1.0, b = 0.2; // Green base
        
        // Random Ornaments (Lights)
        if (Math.random() < 0.1) {
            const colorSet = [[1,0,0], [1,0.8,0], [0,0.5,1]]; // Red, Gold, Blue
            const c = colorSet[Math.floor(Math.random()*3)];
            r=c[0]; g=c[1]; b=c[2];
        }

        coords.push({ x: Math.cos(angle)*radius, y: height, z: Math.sin(angle)*radius, r, g, b });
    }

    // 2. The Trunk (Cylinder) - 10% of particles
    const trunkCount = Math.floor(PARTICLE_COUNT * 0.1);
    for (let i = 0; i < trunkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.8;
        const height = (Math.random() * 3) - 8; // -8 to -5 (Below tree)
        coords.push({ x: Math.cos(angle)*radius, y: height, z: Math.sin(angle)*radius, r: 0.4, g: 0.2, b: 0.1 }); // Brown
    }

    // 3. The Star (Top Cluster) - 5% of particles
    const starCount = Math.floor(PARTICLE_COUNT * 0.05);
    for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.random() * 0.8; // Small ball
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) + 9.5; // Top of tree
        const z = r * Math.cos(phi);
        
        coords.push({ x, y, z, r: 1, g: 1, b: 0.2 }); // Bright Yellow
    }

    // 4. Gifts (Cubes at base) - 15% of particles
    const giftCount = PARTICLE_COUNT - coords.length; // Remaining particles
    const giftCenters = [{x: 3, z: 2, c:[1,0,0]}, {x: -3, z: 2, c:[0,0,1]}, {x: 0, z: -3, c:[1,0,1]}]; // locations
    
    for (let i = 0; i < giftCount; i++) {
        const gift = giftCenters[i % 3];
        const size = 1.5;
        // Random point inside a box
        const lx = (Math.random()-0.5) * size;
        const ly = (Math.random()-0.5) * size;
        const lz = (Math.random()-0.5) * size;
        
        coords.push({
            x: gift.x + lx,
            y: -7 + ly, // Sitting on floor level
            z: gift.z + lz,
            r: gift.c[0], g: gift.c[1], b: gift.c[2]
        });
    }

    return coords;
}

// --- 5. ANIMATION ENGINE ---
let isAnimating = false;
let transitionStart = 0;
let isTreeMode = false;

function morphTo(shapeCoords) {
    // Shuffle particles for "Cloud" transition effect
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        const target = shapeCoords[i % shapeCoords.length];
        
        targetPositions[pIndex * 3] = target.x;
        targetPositions[pIndex * 3 + 1] = target.y;
        targetPositions[pIndex * 3 + 2] = target.z;
        
        // Color transition
        const r = target.r !== undefined ? target.r : 1;
        const g = target.g !== undefined ? target.g : 1;
        const b = target.b !== undefined ? target.b : 1;
        
        colors[pIndex * 3] = r; colors[pIndex * 3 + 1] = g; colors[pIndex * 3 + 2] = b;
    }
    
    geometry.attributes.color.needsUpdate = true;
    transitionStart = performance.now();
    isAnimating = true;
}

// --- 6. TIMELINE ---
const urlParams = new URLSearchParams(window.location.search);
const friendName = urlParams.get('name') || "Friend";

async function runShow() {
    // 1. Countdowns
    morphTo(getTextCoordinates("3", 350)); await wait(1500);
    morphTo(getTextCoordinates("2", 350)); await wait(1500);
    morphTo(getTextCoordinates("1", 350)); await wait(1500);
    
    // 2. Message
    morphTo(getTextCoordinates("Hi " + friendName, 120)); await wait(3000);
    morphTo(getTextCoordinates("Merry Christmas", 100)); await wait(3000);
    
    // 3. The Tree
    morphTo(getDetailedTreeCoordinates());
    isTreeMode = true;
    
    // Fade in Snow
    let opacity = 0;
    const snowIn = setInterval(() => {
        opacity += 0.05;
        snowMat.opacity = opacity;
        if(opacity >= 0.8) clearInterval(snowIn);
    }, 100);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- 7. LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    // A. Morphing Logic
    if (isAnimating) {
        const progress = Math.min((time - transitionStart) / (TRANSITION_DURATION * 1000), 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease out
        
        const pos = geometry.attributes.position.array;
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i*3, iy = i*3+1, iz = i*3+2;
            pos[ix] += (targetPositions[ix] - pos[ix]) * 0.08; // Smooth follow
            pos[iy] += (targetPositions[iy] - pos[iy]) * 0.08;
            pos[iz] += (targetPositions[iz] - pos[iz]) * 0.08;
        }
        geometry.attributes.position.needsUpdate = true;
        if (progress >= 1) isAnimating = false;
    }

    // B. Camera & Object Movement
    if (isTreeMode) {
        // Spin the particle tree
        particles.rotation.y = time * 0.0005;
        
        // Fall Snow
        const sp = snowGeo.attributes.position.array;
        for(let i=1; i<snowCount*3; i+=3) {
            sp[i] -= 0.1; // Drop down
            if(sp[i] < -20) sp[i] = 20; // Reset to top
        }
        snowGeo.attributes.position.needsUpdate = true;

    } else {
        // Gentle text sway
        particles.rotation.y = Math.sin(time * 0.001) * 0.1;
    }

    renderer.render(scene, camera);
}
animate();

// --- 8. EVENTS ---
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('overlay').remove(), 1000);
    document.getElementById('music').play();
    runShow();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});