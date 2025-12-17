import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. SETUP SCENE & GLOW ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02020a); // Almost black blue sky
scene.fog = new THREE.FogExp2(0x02020a, 0.03);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 14);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping;

// BLOOM POST-PROCESSING
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.strength = 1.5; 
bloomPass.radius = 0.8;
bloomPass.threshold = 0.1;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); 
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0xffffff, 10);
spotLight.position.set(5, 15, 5);
spotLight.angle = 0.6;
scene.add(spotLight);

// --- 2. THE TREE ---
const treeGroup = new THREE.Group();
const ornaments = [];

// A. TRUNK (STEM)
const trunkMat = new THREE.MeshStandardMaterial({ 
    color: 0x3d2314, 
    emissive: 0x221100, // Slight brown glow
    roughness: 0.8 
});
const trunkGeo = new THREE.CylinderGeometry(0.6, 0.8, 2.5, 16);
const trunk = new THREE.Mesh(trunkGeo, trunkMat);
trunk.position.y = 1.25; // Sit on floor
treeGroup.add(trunk);

// B. LEAVES
const leafMat = new THREE.MeshStandardMaterial({ 
    color: 0x008000, 
    emissive: 0x001a00, // Green glow to prevent blackness
    roughness: 0.4,
    metalness: 0.6
});
const leafGeo = new THREE.ConeGeometry(0.6, 1.5, 5);
const levels = 9;
for (let y = 0; y < levels; y++) {
    const levelRadius = 3.5 - (y * 0.4); 
    const branches = 9 + (levels - y) * 2;
    for (let i = 0; i < branches; i++) {
        const angle = (i / branches) * Math.PI * 2;
        const x = Math.cos(angle) * levelRadius;
        const z = Math.sin(angle) * levelRadius;
        const branch = new THREE.Mesh(leafGeo, leafMat);
        branch.position.set(x, y * 0.9 + 2.5, z); // +2.5 to sit above trunk
        branch.lookAt(0, y * 0.9 + 4.5, 0); 
        branch.rotateX(1.6);
        treeGroup.add(branch);
    }
}

// C. ORNAMENTS
const lightGeo = new THREE.SphereGeometry(0.12, 8, 8);
const neonColors = [0xff0000, 0x00ff00, 0x00ffff, 0xffff00, 0xff00ff];
for(let i=0; i<80; i++) {
    const y = Math.random() * 8;
    const radius = 3.2 - (y * 0.35);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const color = neonColors[Math.floor(Math.random() * neonColors.length)];
    const material = new THREE.MeshStandardMaterial({ 
        color: color, emissive: color, emissiveIntensity: 2.0 
    });
    const bulb = new THREE.Mesh(lightGeo, material);
    bulb.position.set(x, y + 2.7, z);
    bulb.userData = { offset: Math.random() * 100 };
    treeGroup.add(bulb);
    ornaments.push(bulb);
}

// D. STAR
const starGeo = new THREE.OctahedronGeometry(0.5, 0);
const starMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 3.0 });
const star = new THREE.Mesh(starGeo, starMat);
star.position.y = 11;
treeGroup.add(star);

// Position the whole tree group down so trunk sits on floor
treeGroup.position.y = -3;
scene.add(treeGroup);

// --- 3. GIFTS ON FLOOR ---
const giftGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
for(let i=0; i<12; i++){
    const color = neonColors[Math.floor(Math.random() * neonColors.length)];
    const giftMat = new THREE.MeshStandardMaterial({color: color, emissive: color, emissiveIntensity: 0.8});
    const gift = new THREE.Mesh(giftGeo, giftMat);
    
    // Random position around base, avoiding inside trunk
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.2 + Math.random() * 2.5; 
    gift.position.set(Math.cos(angle)*radius, -2.7, Math.sin(angle)*radius);
    gift.rotation.y = Math.random();
    scene.add(gift);
}

// --- 4. ENVIRONMENT ---
// REFLECTIVE FLOOR
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.5 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3;
scene.add(ground);

// FALLING SNOW PARTICLES
const snowGeo = new THREE.BufferGeometry();
const snowCount = 1500;
const pos = new Float32Array(snowCount * 3);
for(let i=0; i<snowCount*3; i++) pos[i] = (Math.random()-0.5) * 50;
snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const snowMat = new THREE.PointsMaterial({ size: 0.15, color: 0xffffff });
const snow = new THREE.Points(snowGeo, snowMat);
scene.add(snow);

// FLYING SANTA & REINDEER (Neon Silhouette Style)
const santaGroup = new THREE.Group();
// Rudolp nose (Red)
const noseMat = new THREE.MeshBasicMaterial({color: 0xff0000});
const nose = new THREE.Mesh(lightGeo, noseMat);
nose.position.z = 2;
santaGroup.add(nose);
// Other reindeer lights (Gold)
const deerMat = new THREE.MeshBasicMaterial({color: 0xffaa00});
for(let i=1; i<5; i++){
    const d1 = new THREE.Mesh(lightGeo, deerMat); d1.position.set(-0.3, 0.1, 2 - i*0.5); santaGroup.add(d1);
    const d2 = new THREE.Mesh(lightGeo, deerMat); d2.position.set(0.3, 0.1, 2 - i*0.5); santaGroup.add(d2);
}
// Sleigh lights (White/Red cluster)
const sleighMat = new THREE.MeshBasicMaterial({color: 0xffffff});
for(let i=0; i<8; i++){
   const s = new THREE.Mesh(lightGeo, sleighMat);
   s.position.set((Math.random()-0.5)*1, Math.random()*0.5, -1 - Math.random());
   santaGroup.add(s);
}
santaGroup.position.set(-20, 8, -20); // Start position far left
santaGroup.scale.set(1.5, 1.5, 1.5);
scene.add(santaGroup);


// --- 5. ANIMATION LOOP ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.enableZoom = false;
controls.maxPolarAngle = Math.PI / 1.4; // Don't go below floor

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Blink Lights
    ornaments.forEach(bulb => {
        const intensity = 1.5 + Math.sin(time * 3 + bulb.userData.offset);
        bulb.material.emissiveIntensity = intensity;
    });

    // Spin Star
    star.rotation.y -= 0.03;

    // Fall Snow
    snow.position.y -= 0.07;
    if (snow.position.y < -10) snow.position.y = 10;

    // Fly Santa across sky
    santaGroup.position.x += 0.08;
    // Reset Santa when he goes off screen right
    if(santaGroup.position.x > 25) {
        santaGroup.position.x = -25;
        santaGroup.position.z = -15 - Math.random() * 10; // Random distance next pass
    }
    santaGroup.position.y += Math.sin(time * 2) * 0.02; // Slight wavy motion

    controls.update();
    composer.render(); // IMPORTANT: Render with bloom composer
}
animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Name Logic
const urlParams = new URLSearchParams(window.location.search);
const nameParam = urlParams.get('name');
if (nameParam) document.getElementById('friendName').innerText = nameParam;