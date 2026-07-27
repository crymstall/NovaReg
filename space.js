/**
 * NOVA 3D Space Engine (NASA Photography Maps & Rich Starfields)
 */

let scene, camera, renderer;
let stars, galacticCorePoints, supernovaCore, supernovaGlow;
let sun, planets = {};
let currentCameraTarget = new THREE.Vector3(0, 0, 0);

// Performance & Mobile Profiling Flags
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Official NASA & Spacecraft Mapping Datasets (Solar System Scope CC-BY 4.0 via Wikimedia CDN)
const textureURLs = {
    mercury: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Solarsystemscope_texture_2k_mercury.jpg",
    venus: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Solarsystemscope_texture_2k_venus_atmosphere.jpg",
    earth: "https://upload.wikimedia.org/wikipedia/commons/0/04/Solarsystemscope_texture_2k_earth_daymap.jpg",
    mars: "https://upload.wikimedia.org/wikipedia/commons/3/30/Solarsystemscope_texture_2k_mars.jpg",
    jupiter: "https://upload.wikimedia.org/wikipedia/commons/2/22/Solarsystemscope_texture_2k_jupiter.jpg"
};

const planetData = {
    mercury: { name: "Mercury", size: 0.55, distance: 10, speed: 0.025, hasAtmosphere: false },
    venus: { name: "Venus", size: 0.95, distance: 16, speed: 0.018, hasAtmosphere: true, atmosColor: 0xeab308 },
    earth: { name: "Earth", size: 1.0, distance: 22, speed: 0.015, hasAtmosphere: true, atmosColor: 0x3b82f6 },
    mars: { name: "Mars", size: 0.8, distance: 28, speed: 0.012, hasAtmosphere: false },
    jupiter: { name: "Jupiter", size: 2.1, distance: 38, speed: 0.007, hasRings: true }
};

function initSpace() {
    const canvas = document.getElementById('webgl-canvas');
    
    // Disable click trigger until loading is complete
    const trigger = document.querySelector('.supernova-glow-trigger');
    if (trigger) trigger.style.pointerEvents = 'none';

    // Scene Creation
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030308, 0.012);

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
    
    const maxDPR = isMobile ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Ambient & Intense Sun PointLight
    const ambientLight = new THREE.AmbientLight(0x090912);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2.2, 130, 0.5);
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
            subtitle.textContent = `LOADING SYSTEMS: ${progress}%`;
        }
    };

    loadingManager.onLoad = function() {
        const subtitle = document.querySelector('.enter-subtitle');
        if (subtitle) {
            subtitle.textContent = 'CLICK TO ENTER THE SYSTEMS';
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
 * Loads high fidelity textures first, then builds the solar system
 */
function loadTexturesAndBuild(loader) {
    const loadedTextures = {};

    // Asynchronously stream NASA assets
    Object.keys(textureURLs).forEach(key => {
        loader.load(textureURLs[key], (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTextures[key] = tex;
        });
    });

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
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#facc15'); grad.addColorStop(1, '#ea580c');
    sCtx.fillStyle = grad; sCtx.fillRect(0,0,128,128);
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    // Once textures are compiled, map them onto meshes
    Object.keys(planetData).forEach(key => {
        const d = planetData[key];
        const group = new THREE.Group();

        // 3D Sphere geometry
        const geo = new THREE.SphereGeometry(d.size, 32, 32);
        
        // standard PBR material
        const mat = new THREE.MeshStandardMaterial({
            roughness: key === 'earth' ? 0.75 : 0.85,
            metalness: key === 'earth' ? 0.05 : 0.05,
            bumpScale: 0.03
        });

        // Map loaded texture directly on mesh
        loader.load(textureURLs[key], (tex) => {
            mat.map = tex;
            mat.needsUpdate = true;
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = !isMobile;
        mesh.receiveShadow = !isMobile;
        group.add(mesh);

        // Realistic Atmosphere Scattering (Fresnel Shaders)
        if (d.hasAtmosphere && !isMobile) {
            const atmosGeo = new THREE.SphereGeometry(d.size * 1.12, 32, 32);
            const atmosMat = new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    uniform vec3 glowColor;
                    void main() {
                        // Soft realistic gradient scattering
                        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
                        gl_FragColor = vec4(glowColor, 1.0) * intensity;
                    }
                `,
                uniforms: {
                    glowColor: { value: new THREE.Color(d.atmosColor) }
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

        // Add Orbit path lines
        if (!isMobile) {
            const orbitGeo = new THREE.BufferGeometry();
            const orbitPoints = [];
            for (let i = 0; i <= 64; i++) {
                const angle = (i / 64) * Math.PI * 2;
                orbitPoints.push(new THREE.Vector3(Math.cos(angle) * d.distance, 0, Math.sin(angle) * d.distance));
            }
            orbitGeo.setFromPoints(orbitPoints);
            const orbitMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035 });
            const orbitLine = new THREE.Line(orbitGeo, orbitMat);
            scene.add(orbitLine);
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
 * 12,000 Starfield (Richer & Denser Stars)
 */
function createStarfield() {
    const starCount = isMobile ? 3500 : 12000;
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

        // Mix warm yellow-gold stars with cool blue stars
        const starRand = Math.random();
        if (starRand < 0.25) {
            colors[i] = 0.95; colors[i+1] = 0.75; colors[i+2] = 0.65; // Soft gold
        } else if (starRand < 0.5) {
            colors[i] = 0.65; colors[i+1] = 0.85; colors[i+2] = 0.95; // Cool cyan
        } else {
            colors[i] = 0.95; colors[i+1] = 0.95; colors[i+2] = 0.95; // Bright white
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 0.85 : 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

/**
 * Milky Way Nebula Cloud Layer (Cosmic Ambient dust)
 */
function createGalacticCore() {
    const cloudCount = isMobile ? 200 : 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(cloudCount * 3);
    const colors = new Float32Array(cloudCount * 3);

    for (let i = 0; i < cloudCount * 3; i += 3) {
        const radius = 100 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        positions[i] = Math.cos(theta) * radius + (Math.random() - 0.5) * 15;
        positions[i+1] = (Math.random() - 0.5) * 35; // Distribute on a thin disk plane
        positions[i+2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 15;

        // Rich violet, dark blue, and deep rose glows
        const colorRand = Math.random();
        if (colorRand < 0.5) {
            colors[i] = 0.35; colors[i+1] = 0.15; colors[i+2] = 0.65; // Violet
        } else {
            colors[i] = 0.15; colors[i+1] = 0.25; colors[i+2] = 0.55; // Blue-indigo
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 4.5 : 2.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending
    });

    galacticCorePoints = new THREE.Points(geometry, material);
    scene.add(galacticCorePoints);
}

/**
 * Supernova Entrance Event
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

    // Perfectly offset to expose planet on right-side of screen
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

    // Background Rotations
    if (stars) stars.rotation.y = time * 0.003;
    if (galacticCorePoints) galacticCorePoints.rotation.y = -time * 0.001;

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
