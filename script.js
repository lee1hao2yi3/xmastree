import * as THREE from 'three';

// --- CONFIGURATION ---
const PARTICLE_COUNT = 6000; 
const PARTICLE_SIZE = 0.12;
const TRANSITION_DURATION = 2.0; 

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
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

const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- SNOW ---
const snowGeo = new THREE.BufferGeometry();
const snowCount = 2000;
const snowPos = new Float32Array(snowCount * 3);
for(let i=0; i<snowCount*3; i++) snowPos[i] = (Math.random()-0.5) * 50;
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({ size: 0.2, color: 0xffffff, transparent: true, opacity: 0 });
const snowMesh = new THREE.Points(snowGeo, snowMat);
scene.add(snowMesh);

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

function getDetailedTreeCoordinates() {
    const coords = [];
    const leafCount = Math.floor(PARTICLE_COUNT * 0.7);
    for (let i = 0; i < leafCount; i++) {
        const t = i / leafCount;
        const angle = t * Math.PI * 60; 
        const radius = 7 * (1 - t); 
        const height = (t * 14) - 5;
        let r = 0.2, g = 1.0, b = 0.2; 
        if (Math.random() < 0.1) { const c = [[1,0,0], [1,0.8,0], [0,0.5,1]][Math.floor(Math.random()*3)]; r=c[0]; g=c[1]; b=c[2]; }
        coords.push({ x: Math.cos(angle)*radius, y: height, z: Math.sin(angle)*radius, r, g, b });
    }
    const trunkCount = Math.floor(PARTICLE_COUNT * 0.1);
    for (let i = 0; i < trunkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.8;
        const height = (Math.random() * 3) - 8; 
        coords.push({ x: Math.cos(angle)*radius, y: height, z: Math.sin(angle)*radius, r: 0.4, g: 0.2, b: 0.1 }); 
    }
    const starCount = Math.floor(PARTICLE_COUNT * 0.05);
    for (let i = 0; i < starCount; i++) {
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
        const r = Math.random() * 0.8; 
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) + 9.5; 
        const z = r * Math.cos(phi);
        coords.push({ x, y, z, r: 1, g: 1, b: 0.2 }); 
    }
    const giftCount = PARTICLE_COUNT - coords.length; 
    const giftCenters = [{x: 3, z: 2, c:[1,0,0]}, {x: -3, z: 2, c:[0,0,1]}, {x: 0, z: -3, c:[1,0,1]}];
    for (let i = 0; i < giftCount; i++) {
        const gift = giftCenters[i % 3];
        const size = 1.5;
        const lx = (Math.random()-0.5) * size, ly = (Math.random()-0.5) * size, lz = (Math.random()-0.5) * size;
        coords.push({ x: gift.x + lx, y: -7 + ly, z: gift.z + lz, r: gift.c[0], g: gift.c[1], b: gift.c[2] });
    }
    return coords;
}

// --- ANIMATION ENGINE ---
let isAnimating = false, transitionStart = 0, isTreeMode = false;

function morphTo(shapeCoords) {
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        const target = shapeCoords[i % shapeCoords.length];
        targetPositions[pIndex * 3] = target.x; targetPositions[pIndex * 3 + 1] = target.y; targetPositions[pIndex * 3 + 2] = target.z;
        const r = target.r !== undefined ? target.r : 1; const g = target.g !== undefined ? target.g : 1; const b = target.b !== undefined ? target.b : 1;
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
    // Morph Text
    morphTo(getTextCoordinates("3", 350)); await wait(1500);
    morphTo(getTextCoordinates("2", 350)); await wait(1500);
    morphTo(getTextCoordinates("1", 350)); await wait(1500);
    morphTo(getTextCoordinates("Hi " + friendName, 120)); await wait(3000);
    morphTo(getTextCoordinates("Merry Christmas", 100)); await wait(3000);
    
    // Morph Tree
    morphTo(getDetailedTreeCoordinates());
    isTreeMode = true;
    
    // Fade in Snow
    let opacity = 0;
    const snowIn = setInterval(() => {
        opacity += 0.05; snowMat.opacity = opacity;
        if(opacity >= 0.8) clearInterval(snowIn);
    }, 100);

    // NEW: Show Name Overlay
    const finalText = document.getElementById('finalText');
    finalText.innerText = "Merry Christmas, " + friendName;
    setTimeout(() => {
        finalText.style.opacity = '1';
    }, 1000); // Wait 1 second after tree starts forming
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
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
    if (isTreeMode) {
        particles.rotation.y = time * 0.0005;
        const sp = snowGeo.attributes.position.array;
        for(let i=1; i<snowCount*3; i+=3) { sp[i] -= 0.1; if(sp[i] < -20) sp[i] = 20; }
        snowGeo.attributes.position.needsUpdate = true;
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
    document.getElementById('music').play().catch(e => console.log("Music play failed:", e));
    runShow();
});
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});