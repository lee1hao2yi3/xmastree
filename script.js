import * as THREE from 'three';

// --- CONFIGURATION ---
const PARTICLE_COUNT = 7000; // High count for clear text
const PARTICLE_SIZE = 0.12;
const TRANSITION_DURATION = 1.5; 

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x330000); // Deep Maroon Red
scene.fog = new THREE.FogExp2(0x330000, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- 1. MAIN TEXT PARTICLES ---
const geometry = new THREE.BufferGeometry();
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);

// Initialize as scattered gold dust
for (let i = 0; i < PARTICLE_COUNT; i++) {
    currentPositions[i * 3] = (Math.random() - 0.5) * 80;
    currentPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    currentPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    
    colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0; // Pure Gold
}
geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE, 
    vertexColors: true, 
    transparent: true, 
    opacity: 0.95, 
    blending: THREE.AdditiveBlending, 
    depthWrite: false
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- 2. FALLING GOLD COINS (InstancedMesh) ---
const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 20); // Cylinder shape
const coinMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, 
    metalness: 1.0, 
    roughness: 0.3,
    emissive: 0xaa6600,
    emissiveIntensity: 0.2
});
const coinCount = 300;
const coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, coinCount);
const dummy = new THREE.Object3D();
const coinData = []; 

for(let i=0; i<coinCount; i++) {
    coinData.push({
        x: (Math.random()-0.5) * 70,
        y: Math.random() * 50 + 10,
        z: (Math.random()-0.5) * 30,
        speed: 0.15 + Math.random() * 0.2,
        rotSpeed: Math.random() * 0.1
    });
}
scene.add(coinMesh);

// Lights for the coins
const dirLight = new THREE.DirectionalLight(0xffd700, 2.5);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));


// --- 3. TEXT GENERATOR ---
function getTextCoordinates(text, fontSize = 100, yOffset = 0) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 1024;
    
    // Use a bold font (System default sans-serif usually supports Chinese)
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "Hei", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const coords = [];
    const step = 4; // Resolution (lower = more detailed)
    
    for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
            if (data[(y * canvas.width + x) * 4] > 128) {
                // Map 2D canvas to 3D world
                coords.push({ 
                    x: (x - canvas.width/2) * 0.05, 
                    y: -(y - canvas.height/2) * 0.05 + yOffset, // Add yOffset for stacking lines
                    z: 0 
                });
            }
        }
    }
    return coords;
}

// --- 4. ANIMATION ENGINE ---
let isAnimating = false, transitionStart = 0;
let isCoinMode = false;

function morphTo(shapeCoords) {
    // Randomize indices for "explosion" morph effect
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        
        // If we have more particles than coordinates, loop over coordinates
        const target = shapeCoords[i % shapeCoords.length];
        
        targetPositions[pIndex * 3] = target.x; 
        targetPositions[pIndex * 3 + 1] = target.y; 
        targetPositions[pIndex * 3 + 2] = target.z;
    }
    transitionStart = performance.now();
    isAnimating = true;
}

// --- 5. SHOW SEQUENCE ---
const urlParams = new URLSearchParams(window.location.search);
const friendName = urlParams.get('name') || "";

async function runShow() {
    // 1. Countdown
    morphTo(getTextCoordinates("3", 350)); await wait(1000);
    morphTo(getTextCoordinates("2", 350)); await wait(1000);
    morphTo(getTextCoordinates("1", 350)); await wait(1000);
    
    // 2. Combine the CNY Greeting into one Big Scene
    // Line 1: "祝你" (Wish You) - Shifted UP (y = 6)
    const line1 = getTextCoordinates("祝你", 180, 7); 
    // Line 2: "马年行大运" (Horse Year Luck) - Shifted DOWN (y = -2)
    const line2 = getTextCoordinates("马年行大运", 150, -3); 
    
    // Combine them into one coordinate list
    const finalShape = [...line1, ...line2];
    
    morphTo(finalShape);
    
    // 3. Enable Coin Rain
    isCoinMode = true;

    // 4. Show Name at bottom
    const finalText = document.getElementById('finalText');
    if(friendName) {
        finalText.innerText = "To: " + friendName;
        setTimeout(() => { finalText.style.opacity = '1'; }, 1000);
    }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- 6. RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    // A. Particle Morphing Logic
    if (isAnimating) {
        const progress = Math.min((time - transitionStart) / (TRANSITION_DURATION * 1000), 1);
        const pos = geometry.attributes.position.array;
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i*3, iy = i*3+1, iz = i*3+2;
            // Linear Interpolation (Lerp)
            pos[ix] += (targetPositions[ix] - pos[ix]) * 0.08;
            pos[iy] += (targetPositions[iy] - pos[iy]) * 0.08;
            pos[iz] += (targetPositions[iz] - pos[iz]) * 0.08;
        }
        geometry.attributes.position.needsUpdate = true;
        if (progress >= 1) isAnimating = false;
    }

    // B. Idle Sway (Make the text float gently)
    if (!isAnimating) {
        particles.rotation.y = Math.sin(time * 0.001) * 0.1;
        particles.rotation.x = Math.sin(time * 0.002) * 0.05;
    }

    // C. Falling Coins Logic
    if (isCoinMode) {
        coinMesh.visible = true;
        for(let i=0; i<coinCount; i++) {
            const d = coinData[i];
            d.y -= d.speed; // Fall down
            
            dummy.position.set(d.x, d.y, d.z);
            dummy.rotation.x += d.rotSpeed;
            dummy.rotation.z += d.rotSpeed; // Spin while falling
            dummy.updateMatrix();
            coinMesh.setMatrixAt(i, dummy.matrix);

            // Reset to top if it falls below screen
            if(d.y < -25) {
                d.y = 35;
                d.x = (Math.random()-0.5) * 70;
            }
        }
        coinMesh.instanceMatrix.needsUpdate = true;
    } else {
        coinMesh.visible = false;
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