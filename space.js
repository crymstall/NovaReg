/**
 * NOVA 3D Space Engine (NASA Photography Maps, Local Storage, Specular Ocean Sunglint)
 */

let scene, camera, renderer;
let stars, galacticCorePoints, supernovaCore, supernovaGlow;
let sun, planets = {};
let currentCameraTarget = new THREE.Vector3(0, 0, 0);

// Performance & Mobile Profiling Flags
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Localized, high-speed, CORS-free NASA/Solar System Scope photographic textures
const textureURLs = {
    mercury: "textures/mercury.jpg",
    venus: "textures/venus.jpg",
    earth: "textures/earth.jpg",
    mars: "textures/mars.jpg",
    jupiter: "textures/jupiter.jpg"
};

const planetData = {
    mercury: { name: "Mercury", size: 0.55, distance: 10, speed: 0.025, roughness: 1.0, metalness: 0.0 },
    venus: { name: "Venus", size: 0.95, distance: 16, speed: 0.018, roughness: 0.4, metalness: 0.1, hasAtmosphere: true, atmosColor: [0.95, 0.7, 0.15] },
    earth: { name: "Earth", size: 1.0, distance: 22, speed: 0.015, roughness: 0.8, metalness: 0.05, hasAtmosphere: true, atmosColor: [0.35, 0.65, 1.0] },
    mars: { name: "Mars", size: 0.8, distance: 28, speed: 0.012, roughness: 0.9, metalness: 0.0 },
    jupiter: { name: "Jupiter", size: 2.1, distance: 38, speed: 0.007, roughness: 0.6, metalness: 0.0, hasRings: true }
};

function initSpace() {
    const canvas = document.getElementById('webgl-canvas');
    
    // Disable click trigger until loading is complete
    const trigger = document.querySelector('.supernova-glow-trigger');
    if (trigger) trigger.style.pointerEvents = 'none';

    // Scene Creation
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030308, 0.008);

    // Camera Configuration
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    // Renderer Configuration
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !isMobile,
        alpha: false,
        powerPreference: "high-performance"
    });
    
    const maxDPR = isMobile ? 1.3 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // High Contrast Lighting: ZERO ambient light fill for realistic pitch-black night-sides
    const ambientLight = new THREE.AmbientLight(0x010103);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2.8, 150, 0.5);
    sunLight.castShadow = !isMobile;
    sunLight.shadow.bias = -0.002;
    scene.add(sunLight);

    // Initialize Loading Manager
    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);

    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = Math.round((itemsLoaded / itemsTotal) * 100);
        const subtitle = document.querySelector('.enter-subtitle');
        if (subtitle) {
            subtitle.textContent = `TELEMETRY LOADING: ${progress}%`;
        }
    };

    loadingManager.onLoad = function() {
        const subtitle = document.querySelector('.enter-subtitle');
        if (subtitle) {
            subtitle.textContent = 'SYSTEMS SYNCED: CLICK TO ENTER';
            subtitle.style.color = '#10b981'; 
            subtitle.style.textShadow = '0 0 15px rgba(16, 185, 129, 0.6)';
        }
        if (trigger) trigger.style.pointerEvents = 'auto';
    };

    // Load NASA Textures & Build Cosmos
    loadTexturesAndBuild(textureLoader);

    window.addEventListener('resize', onWindowResize);
    animate();
}

/**
 * Loads high fidelity textures and compiles PBR maps
 */
function loadTexturesAndBuild(loader) {
    // Create Background elements
    createStarfield();
    createGalacticCore();
    createSupernova();

    // Create Sun Core
    const sunGeo = new THREE.SphereGeometry(3.0, 32, 32);
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 128; sunCanvas.height = 128;
    const sCtx = sunCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64,64,0, 64,64,64);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#fef08a'); grad.addColorStop(1, '#ea580c');
    sCtx.fillStyle = grad; sCtx.fillRect(0,0,128,128);
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    // Assemble the 5 Planets
    Object.keys(planetData).forEach(key => {
        const d = planetData[key];
        const group = new THREE.Group();

        // 3D Sphere geometry
        const geo = new THREE.SphereGeometry(d.size, 32, 32);
        
        // Standard PBR Material
        const mat = new THREE.MeshStandardMaterial({
            roughness: d.roughness,
            metalness: d.metalness,
            bumpScale: 0.03
        });

        // Load NASA Base Map and procedurally compile specular/roughness map for Earth
        loader.load(textureURLs[key], (tex) => {
            mat.map = tex;
            
            if (key === 'earth') {
                // Compile pixel-perfect Specular Roughness Map in-memory
                mat.roughnessMap = generateSpecularRoughnessMap(tex.image);
                mat.roughness = 1.0; // Handed over to map
            }
            
            mat.needsUpdate = true;
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = !isMobile;
        mesh.receiveShadow = !isMobile;
        group.add(mesh);

        // SUN-ALIGNED CRESCENT ATMOSPHERE SCATTERING (GLSL Shaders)
        if (d.hasAtmosphere && !isMobile) {
            const atmosGeo = new THREE.SphereGeometry(d.size * 1.15, 32, 32);
            const atmosMat = new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vNormalCam;
                    varying vec3 vWorldPosition;
                    void main() {
                        vNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
                        vNormalCam = normalize(normalMatrix * normal);
                        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    varying vec3 vNormalCam;
                    varying vec3 vWorldPosition;
                    uniform vec3 glowColor;
                    
                    void main() {
                        // 1. Calculate lighting direction from the Sun (Sun is at origin 0,0,0)
                        vec3 lightDir = normalize(-vWorldPosition);
                        
                        // 2. Compute solar alignment (only glow on sunlit side)
                        float alignment = max(0.0, dot(normalize(vNormal), lightDir));
                        
                        // 3. Compute realistic crescent scatter gradient (glows at edges)
                        float scattering = pow(1.0 - max(0.0, dot(vNormalCam, vec3(0.0, 0.0, 1.0))), 3.5);
                        
                        // 4. Smooth out transition
                        float intensity = scattering * alignment;
                        
                        gl_FragColor = vec4(glowColor, 1.0) * intensity;
                    }
                `,
                uniforms: {
                    glowColor: { value: new THREE.Color().fromArray(d.atmosColor) }
                },
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true
            });
            const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
            group.add(atmosMesh);
        }

        // Jupiter Rings
        if (d.hasRings) {
            const ringGeo = new THREE.RingGeometry(d.size * 1.25, d.size * 1.85, 64);
            ringGeo.rotateX(Math.PI / 2);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xe0a96d,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.22,
                roughness: 0.95
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            group.add(ring);
        }

        const startAngle = Math.random() * Math.PI * 2;
        group.position.set(Math.cos(startAngle) * d.distance, 0, Math.sin(startAngle) * d.distance);
        scene.add(group);

        planets[key] = {
            group: group,
            mesh: mesh,
            distance: d.distance,
            speed: d.speed,
            angle: startAngle
        };
    });
}

/**
 * Procedural Specular Roughness Map Compiler
 * Analyzes dark blue ocean pixels and returns highly reflective metallic indexes
 */
function generateSpecularRoughnessMap(img) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 512, 256);

    const imgData = ctx.getImageData(0, 0, 512, 256);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const brightness = (r + g + b) / 3;

        // In NASA daymaps, oceans are deep dark blue/black.
        if (b > r && b > g && brightness < 65) {
            // Highly reflective ocean (glass-smooth roughness = 0.05)
            data[i] = 13; data[i+1] = 13; data[i+2] = 13;
        } else {
            // Fully rough dry land (roughness = 0.95)
            data[i] = 242; data[i+1] = 242; data[i+2] = 242;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

/**
 * 16,000 Pinprick Stars (Deep Field)
 */
function createStarfield() {
    const starCount = isMobile ? 3500 : 16000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
        const radius = 180 + Math.random() * 220;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i+1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i+2] = radius * Math.cos(phi);

        const starRand = Math.random();
        if (starRand < 0.25) {
            colors[i] = 0.95; colors[i+1] = 0.8; colors[i+2] = 0.7; // Warm gold
        } else if (starRand < 0.45) {
            colors[i] = 0.7; colors[i+1] = 0.85; colors[i+2] = 0.95; // Cool cyan
        } else {
            colors[i] = 0.95; colors[i+1] = 0.95; colors[i+2] = 0.95; // Crisp white
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 0.7 : 0.4, // Extremely small pinprick size for realism
        vertexColors: true,
        transparent: true,
        opacity: 0.85
    });

    stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

/**
 * Milky Way Nebula Core Dust Lane
 */
function createGalacticCore() {
    const cloudCount = isMobile ? 200 : 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(cloudCount * 3);
    const colors = new Float32Array(cloudCount * 3);

    for (let i = 0; i < cloudCount * 3; i += 3) {
        const radius = 90 + Math.random() * 140;
        const theta = Math.random() * Math.PI * 2;
        positions[i] = Math.cos(theta) * radius + (Math.random() - 0.5) * 15;
        positions[i+1] = (Math.random() - 0.5) * 45; 
        positions[i+2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 15;

        const colorRand = Math.random();
        if (colorRand < 0.5) {
            colors[i] = 0.25; colors[i+1] = 0.12; colors[i+2] = 0.55; // Violet
        } else {
            colors[i] = 0.12; colors[i+1] = 0.18; colors[i+2] = 0.45; // Blue-indigo
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 4.0 : 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
    });

    galacticCorePoints = new THREE.Points(geometry, material);
    scene.add(galacticCorePoints);
}

/**
 * Supernova Core
 */
function createSupernova() {
    const particleCount = isMobile ? 300 : 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 3.5;
        positions[i] = Math.cos(theta) * r;
        positions[i+1] = (Math.random() - 0.5) * 1.5;
        positions[i+2] = Math.sin(theta) * r;

        const colorRatio = Math.random();
        colors[i] = colorRatio * 0.8 + 0.2; 
        colors[i+1] = 0.1;                  
        colors[i+2] = colorRatio * 0.9 + 0.1; 
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.25,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });

    supernovaCore = new THREE.Points(geometry, material);
    scene.add(supernovaCore);

    const glowGeo = new THREE.SphereGeometry(4, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x9333ea,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
    });
    supernovaGlow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(supernovaGlow);
}

function triggerSupernovaExplosion() {
    gsap.to(supernovaCore.scale, { x: 5, y: 5, z: 5, duration: 0.8, ease: "power4.out" });
    gsap.to(supernovaGlow.scale, { x: 8, y: 8, z: 8, duration: 0.6, ease: "power3.out" });

    gsap.to(camera.position, {
        x: 0,
        y: 18,
        z: 32,
        duration: 1.8,
        ease: "power2.inOut",
        onComplete: () => {
            scene.remove(supernovaCore);
            scene.remove(supernovaGlow);
            flyToPlanet('mercury', 1.0);
        }
    });
}

function flyToPlanet(key, duration = 2.2) {
    const p = planets[key];
    if (!p) return;

    const offsetDistance = planetData[key].size * 4.2;
    currentCameraTarget = p.group.position;

    const targetX = p.group.position.x - offsetDistance;
    const targetY = p.group.position.y + offsetDistance * 0.4;
    const targetZ = p.group.position.z + offsetDistance * 1.25;

    gsap.to(camera.position, {
        x: targetX,
        y: targetY,
        z: targetZ,
        duration: duration,
        ease: "power3.inOut"
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Twinkling stars & slow rotation
    if (stars) {
        stars.rotation.y = time * 0.002;
        stars.material.opacity = 0.65 + Math.sin(time * 3.5) * 0.25;
    }
    if (galacticCorePoints) galacticCorePoints.rotation.y = -time * 0.0015;

    // Supernova ambient spin
    if (supernovaCore) {
        supernovaCore.rotation.y = time * 0.08;
        supernovaGlow.scale.x = 1.0 + Math.sin(time * 2.0) * 0.08;
        supernovaGlow.scale.y = 1.0 + Math.sin(time * 2.0) * 0.08;
    }

    if (sun) sun.rotation.y = time * 0.025;

    // Advance orbital mathematics and planet axises
    Object.keys(planets).forEach(key => {
        const p = planets[key];
        p.angle += p.speed * 0.12;
        p.group.position.x = Math.cos(p.angle) * p.distance;
        p.group.position.z = Math.sin(p.angle) * p.distance;
        p.mesh.rotation.y += 0.005; // Soft realistic spin
    });

    camera.lookAt(currentCameraTarget);
    renderer.render(scene, camera);
}
