import * as THREE from 'three';

// --- MOBILE DETECTION ---
const isMobile = window.innerWidth < 768;

// --- CONFIGURATION ---
// Reduce particles on mobile for better performance
const PARTICLE_COUNT = isMobile ? 3500 : 7000; 
const PARTICLE_SIZE = isMobile ? 0.15 : 0.12; // Slightly bigger dots on mobile
const TRANSITION_DURATION = 1.5; 

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x330000); // Deep Maroon
scene.fog = new THREE.FogExp2(0x330000, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
// Move camera slightly further back on mobile
camera.position.set(0, 0, isMobile ? 55 : 40);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

// --- 1. PARTICLES (TEXT) ---
const geometry = new THREE.BufferGeometry();
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
    currentPositions[i * 3] = (Math.random() - 0.5) * 80;
    currentPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    currentPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0;
}
geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: PARTICLE_SIZE, vertexColors: true, transparent: true, opacity: 0.95, 
    blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- 2. FALLING COINS ---
const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 20);
const coinMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, metalness: 1.0, roughness: 0.3, emissive: 0xaa6600, emissiveIntensity: 0.2
});
const coinCount = isMobile ? 150 : 300; // Fewer coins on mobile
const coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, coinCount);
const dummy = new THREE.Object3D();
const coinData = []; 

for(let i=0; i<coinCount; i++) {
    coinData.push({
        x: (Math.random()-0.5) * 70, y: Math.random() * 50 + 10, z: (Math.random()-0.5) * 30,
        speed: 0.15 + Math.random() * 0.2, rotSpeed: Math.random() * 0.1
    });
}
scene.add(coinMesh);

const dirLight = new THREE.DirectionalLight(0xffd700, 2.5);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));


// --- 3. GENERATOR ---
function getTextCoordinates(text, fontSize = 100, yOffset = 0) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 1024;
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "Hei", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const coords = [];
    // Mobile optimization: Use fewer points (higher step) to fill smaller space
    const step = isMobile ? 6 : 4; 
    
    // Scale factor: Smaller on mobile to fit width
    const scale = isMobile ? 0.025 : 0.05; 

    for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
            if (data[(y * canvas.width + x) * 4] > 128) {
                coords.push({ 
                    x: (x - canvas.width/2) * scale, 
                    y: -(y - canvas.height/2) * scale + yOffset, 
                    z: 0 
                });
            }
        }
    }
    return coords;
}

// --- 4. ENGINE ---
let isAnimating = false, transitionStart = 0, isCoinMode = false;

function morphTo(shapeCoords) {
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pIndex = indices[i];
        // If shape has fewer points, loop; if more, clip (rare with this count)
        const target = shapeCoords[i % shapeCoords.length];
        targetPositions[pIndex * 3] = target.x; 
        targetPositions[pIndex * 3 + 1] = target.y; 
        targetPositions[pIndex * 3 + 2] = target.z;
    }
    transitionStart = performance.now();
    isAnimating = true;
}

// --- 5. TIMELINE ---
const urlParams = new URLSearchParams(window.location.search);
const friendName = urlParams.get('name') || "Friend";

async function runShow() {
    // 1. Countdown
    morphTo(getTextCoordinates("3", 350)); await wait(1000);
    morphTo(getTextCoordinates("2", 350)); await wait(1000);
    morphTo(getTextCoordinates("1", 350)); await wait(1000);
    
    // 2. Big Greeting (Two Lines)
    // On Mobile: Adjust spacing so lines are closer together since text is smaller
    const line1Y = isMobile ? 4 : 7;
    const line2Y = isMobile ? -2 : -3;

    const line1 = getTextCoordinates("祝你", 180, line1Y); 
    const line2 = getTextCoordinates("马年行大运", 150, line2Y); 
    
    morphTo([...line1, ...line2]);
    
    // 3. Start Coins
    isCoinMode = true;

    // 4. SHOW: "Huat Ah, [Name]!"
    const finalText = document.getElementById('finalText');
    finalText.innerText = "Huat Ah, " + friendName + "!";
    setTimeout(() => { finalText.style.opacity = '1'; }, 1000);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- 6. LOOP ---
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
    
    if (!isAnimating) {
        particles.rotation.y = Math.sin(time * 0.001) * 0.1;
        particles.rotation.x = Math.sin(time * 0.002) * 0.05;
    }

    if (isCoinMode) {
        coinMesh.visible = true;
        for(let i=0; i<coinCount; i++) {
            const d = coinData[i];
            d.y -= d.speed;
            dummy.position.set(d.x, d.y, d.z);
            dummy.rotation.x += d.rotSpeed; dummy.rotation.z += d.rotSpeed;
            dummy.updateMatrix();
            coinMesh.setMatrixAt(i, dummy.matrix);
            if(d.y < -25) { d.y = 35; d.x = (Math.random()-0.5) * 70; }
        }
        coinMesh.instanceMatrix.needsUpdate = true;
    } else { coinMesh.visible = false; }

    renderer.render(scene, camera);
}
animate();

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