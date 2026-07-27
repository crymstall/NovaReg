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
    mercury: { name: "Mercury", size: 0.55, distance: 10, speed: 0.025, roughness: 0.88, metalness: 0.08, bumpScale: 0.025 },
    venus: { name: "Venus", size: 0.95, distance: 16, speed: 0.018, roughness: 0.45, metalness: 0.12, hasAtmosphere: true, atmosColor: [0.05, 0.75, 1.0], bumpScale: 0.01 },
    earth: { name: "Earth", size: 1.0, distance: 22, speed: 0.015, roughness: 0.7, metalness: 0.1, hasAtmosphere: true, atmosColor: [0.0, 0.65, 1.0], bumpScale: 0.02 },
    mars: { name: "Mars", size: 0.8, distance: 28, speed: 0.012, roughness: 0.85, metalness: 0.05, hasAtmosphere: true, atmosColor: [0.1, 0.55, 0.95], bumpScale: 0.025 },
    jupiter: { name: "Jupiter", size: 2.1, distance: 38, speed: 0.007, roughness: 0.65, metalness: 0.05, bumpScale: 0.01 }
};

function initSpace() {
    const canvas = document.getElementById('webgl-canvas');
    
    // Disable click trigger until loading is complete
    const trigger = document.querySelector('.supernova-glow-trigger');
    if (trigger) trigger.style.pointerEvents = 'none';

    // Scene Creation
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030308, 0.008);

    // NASA Orbital Telephoto Perspective (42 deg FOV flattens wide-angle distortion)
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // Bright, crisp NASA photographic clarity

    // True solar system lighting: vibrant solar beam + balanced ambient starlight fill
    const ambientLight = new THREE.AmbientLight(0x323d52, 1.4);
    scene.add(ambientLight);

    const cosmicFill = new THREE.DirectionalLight(0x406080, 0.75);
    cosmicFill.position.set(-30, 20, -30);
    scene.add(cosmicFill);

    const sunLight = new THREE.PointLight(0xfffcf5, 3.8, 350, 0.5);
    sunLight.castShadow = !isMobile;
    sunLight.shadow.bias = -0.001;
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

        // Immediately show Earth BIG and photorealistic on the first screen
        flyToPlanet('earth', 0);
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

    // Assemble the 5 Planets
    Object.keys(planetData).forEach(key => {
        const d = planetData[key];
        const group = new THREE.Group();

        // Razor-sharp 128-segment sphere geometry for true NASA Hasselblad limb curvature
        const geo = new THREE.SphereGeometry(d.size, 128, 128);
        
        // Photorealistic PBR Material
        const mat = new THREE.MeshStandardMaterial({
            roughness: d.roughness,
            metalness: d.metalness,
            bumpScale: d.bumpScale || 0.02
        });

        // Load NASA Base Map with sRGB color encoding for true photographic tones
        loader.load(textureURLs[key], (tex) => {
            tex.encoding = THREE.sRGBEncoding;
            tex.anisotropy = Math.min(renderer.capabilities.maxAnisotropy, 16);

            // Apply Electric Sapphire Blue, Sky Cyan, Cobalt Navy & Crisp White NOVA logo palette
            const coloredTex = colorizePlanetTexture(tex.image, key);
            coloredTex.encoding = THREE.sRGBEncoding;
            coloredTex.anisotropy = Math.min(renderer.capabilities.maxAnisotropy, 16);

            mat.map = coloredTex;
            mat.bumpMap = tex;
            
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

        // TRUE NASA ORBITAL ATMOSPHERE (Razor-thin Fresnel limb ribbon + solar scatter)
        if (d.hasAtmosphere && !isMobile) {
            const atmosGeo = new THREE.SphereGeometry(d.size * 1.055, 64, 64);
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
                        vec3 lightDir = normalize(-vWorldPosition);
                        float alignment = max(0.0, dot(normalize(vNormal), lightDir));
                        
                        // pow(6.0) creates the unmistakable thin, delicate atmospheric ribbon seen from orbit
                        float scattering = pow(1.0 - max(0.0, dot(vNormalCam, vec3(0.0, 0.0, 1.0))), 6.0);
                        float innerHaze = pow(1.0 - max(0.0, dot(vNormalCam, vec3(0.0, 0.0, 1.0))), 2.5) * 0.25;
                        
                        float intensity = (scattering + innerHaze) * pow(alignment, 0.7);
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
                color: 0x38bdf8,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.28,
                roughness: 0.35,
                metalness: 0.8
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
 * Procedural NOVA Logo Color Grader
 * Maps planet texture luminance into Electric Sapphire Blue, Sky Cyan, Deep Midnight Indigo & Ice White
 */
function colorizePlanetTexture(img, key) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width || 1024;
    canvas.height = img.height || 512;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const palettes = {
        mercury: [[4, 12, 38], [10, 85, 220], [60, 195, 255], [235, 248, 255]],
        venus:   [[6, 22, 55], [20, 110, 245], [80, 215, 255], [245, 252, 255]],
        earth:   [[2, 11, 36], [0, 88, 245],   [40, 195, 255], [255, 255, 255]],
        mars:    [[6, 16, 48], [15, 80, 210],  [70, 205, 255], [240, 250, 255]],
        jupiter: [[4, 14, 42], [12, 92, 235],  [65, 210, 255], [245, 250, 255]]
    };

    const p = palettes[key] || palettes.earth;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        
        let c;
        if (lum < 0.28) {
            const t = lum / 0.28;
            c = lerpRGB(p[0], p[1], t);
        } else if (lum < 0.65) {
            const t = (lum - 0.28) / 0.37;
            c = lerpRGB(p[1], p[2], t);
        } else {
            const t = (lum - 0.65) / 0.35;
            c = lerpRGB(p[2], p[3], Math.min(1.0, t));
        }

        data[i] = c[0];
        data[i+1] = c[1];
        data[i+2] = c[2];
    }

    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

function lerpRGB(c0, c1, t) {
    return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t)
    ];
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
        if (starRand < 0.30) {
            colors[i] = 0.0; colors[i+1] = 0.65; colors[i+2] = 1.0; // Electric Sky Cyan
        } else if (starRand < 0.60) {
            colors[i] = 0.2; colors[i+1] = 0.75; colors[i+2] = 1.0; // Sapphire Blue
        } else {
            colors[i] = 1.0; colors[i+1] = 1.0; colors[i+2] = 1.0; // Crisp Pure White
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
 * Milky Way Nebula Core Dust Lane (Natural silvery-grey starlight, zero purple)
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
            colors[i] = 0.0; colors[i+1] = 0.35; colors[i+2] = 0.95; // Electric Sapphire Blue aura
        } else {
            colors[i] = 0.05; colors[i+1] = 0.65; colors[i+2] = 1.0; // Glowing Sky Cyan nebula haze
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 4.5 : 3.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
    });

    galacticCorePoints = new THREE.Points(geometry, material);
    scene.add(galacticCorePoints);
}

function triggerSupernovaExplosion() {
    flyToPlanet('earth', 1.0);
}

function flyToPlanet(key, duration = 2.2) {
    const p = planets[key];
    if (!p) return;

    const offsetDistance = planetData[key].size * 4.8;
    currentCameraTarget = p.group.position;

    // Position camera at a perfect NASA orbital phase angle (22 deg from Sun-Planet line)
    // This guarantees every part of the planet is gorgeously sunlit with a crisp terminator shadow on the edge!
    const phaseAngle = 0.38; // ~22 degrees in radians
    const camDirX = Math.cos(p.angle + phaseAngle);
    const camDirZ = Math.sin(p.angle + phaseAngle);

    const targetX = p.group.position.x + camDirX * offsetDistance;
    const targetY = p.group.position.y + offsetDistance * 0.18; // Authentic slight orbital elevation
    const targetZ = p.group.position.z + camDirZ * offsetDistance;

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

    // Advance orbital mathematics and stately, majestic planet spin
    Object.keys(planets).forEach(key => {
        const p = planets[key];
        p.angle += p.speed * 0.08;
        p.group.position.x = Math.cos(p.angle) * p.distance;
        p.group.position.z = Math.sin(p.angle) * p.distance;
        p.mesh.rotation.y += 0.0014; // Immense, stately real-time planetary spin
    });

    camera.lookAt(currentCameraTarget);
    renderer.render(scene, camera);
}
