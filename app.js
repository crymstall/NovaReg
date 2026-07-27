/**
 * NOVA SPA Controller & Navigation Manager
 */

// Content mapping for the 5 interactive Planets
const pageData = {
    mercury: {
        badge: "MERCURY",
        title: "The Inner Sanctum",
        body: "<p>Welcome to Nova's innermost core. Operating on the scorching edge of our stellar systems, Mercury represents our low-latency, rapid prototype architectures.</p>",
        coords: "COORDS: 0.00.10"
    },
    venus: {
        badge: "VENUS",
        title: "The Golden Forge",
        body: "<p>An atmospheric engine of extreme pressure. Venus is where we refine our style, design systems, and premium responsive typography to look completely original and beautiful.</p>",
        coords: "COORDS: 0.00.16"
    },
    earth: {
        badge: "EARTH",
        title: "The Gateway",
        body: "<p>The terraformed homeland of our operations. Earth is our primary project portal, integrating multi-agent codebases, private git deployment pipelines, and high-fidelity 3D assets.</p>",
        coords: "COORDS: 0.00.22"
    },
    mars: {
        badge: "MARS",
        title: "Terraformed Core",
        body: "<p>We are a compact, battle-hardened architecture collective. Building elegant, secure, and production-ready applications with robust structural performance, designed for maximum resilience.</p>",
        coords: "COORDS: 0.00.28"
    },
    jupiter: {
        badge: "JUPITER",
        title: "Stellar Gigastructure",
        body: "<p>Establish secure telemetry. We are open to technical consultation, architectural audits, and high-performance product engineering queries.</p><p style='margin-top:15px; font-family:monospace; font-size:0.8rem; color:rgba(255,255,255,0.4)'>root@51.77.53.215</p>",
        coords: "COORDS: 0.00.38"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initSpace();

    const enterBtn = document.getElementById('enter-btn');
    const landingContainer = document.getElementById('landing-container');
    const mainContainer = document.getElementById('main-container');
    const flashOverlay = document.querySelector('.flash-overlay');
    const contentCard = document.getElementById('content-card');
    const navButtons = document.querySelectorAll('.nav-btn');

    /**
     * LANDING TO MAIN TRANSITION (Flashbang Solar Flare)
     */
    enterBtn.addEventListener('click', () => {
        triggerSupernovaExplosion();

        gsap.timeline()
            .to(flashOverlay, {
                opacity: 1,
                duration: 0.4,
                ease: "expo.out",
                onComplete: () => {
                    landingContainer.classList.add('hidden');
                    landingContainer.classList.remove('active');
                    mainContainer.classList.remove('hidden');
                    
                    if (contentCard) {
                        setTimeout(() => {
                            contentCard.classList.add('visible');
                        }, 600);
                    }
                }
            })
            .to(flashOverlay, {
                opacity: 0,
                duration: 1.5,
                ease: "power2.inOut"
            });
    });

    /**
     * NAVIGATION ROUTER (Pure Space View - Zero left-side text boxes)
     */
    const planetOrder = ['mercury', 'venus', 'earth', 'mars', 'jupiter'];
    let currentPlanetIndex = 2; // Default active planet is Earth (index 2)

    function navigateToPlanet(pageKey) {
        if (!pageData[pageKey]) return;
        const btn = document.querySelector(`.nav-btn[data-page="${pageKey}"]`);
        if (btn && btn.classList.contains('active')) return;

        // If user swipes while still on the landing screen, smoothly enter main view
        if (landingContainer && !landingContainer.classList.contains('hidden')) {
            landingContainer.classList.add('hidden');
            landingContainer.classList.remove('active');
            mainContainer.classList.remove('hidden');
        }

        navButtons.forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        currentPlanetIndex = planetOrder.indexOf(pageKey);

        if (contentCard) contentCard.classList.remove('visible');
        flyToPlanet(pageKey, 2.2);
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pageKey = e.currentTarget.getAttribute('data-page');
            navigateToPlanet(pageKey);
        });
    });

    /**
     * SWIPE, SCROLL & DRAG NAVIGATION CONTROLLER
     * Supports Trackpad Swipe Down/Up, Mouse Wheel Scroll Down/Up, Touch Swipe, and Keyboard
     */
    let isNavigating = false;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeStartTime = 0;
    let wheelDeltaAccumulator = 0;

    function goNextPlanet() {
        if (isNavigating) return;
        isNavigating = true;
        wheelDeltaAccumulator = 0;
        currentPlanetIndex = (currentPlanetIndex + 1) % planetOrder.length;
        navigateToPlanet(planetOrder[currentPlanetIndex]);
        setTimeout(() => { 
            isNavigating = false; 
            wheelDeltaAccumulator = 0; 
        }, 950);
    }

    function goPrevPlanet() {
        if (isNavigating) return;
        isNavigating = true;
        wheelDeltaAccumulator = 0;
        currentPlanetIndex = (currentPlanetIndex - 1 + planetOrder.length) % planetOrder.length;
        navigateToPlanet(planetOrder[currentPlanetIndex]);
        setTimeout(() => { 
            isNavigating = false; 
            wheelDeltaAccumulator = 0; 
        }, 950);
    }

    // 1. Trackpad Swipe Down / Up & Mouse Wheel Scroll Down / Up (Vertical + Horizontal)
    window.addEventListener('wheel', (e) => {
        const primaryDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        wheelDeltaAccumulator += primaryDelta;

        if (wheelDeltaAccumulator > 35) { // Swipe / scroll DOWN or LEFT -> Next Tab
            goNextPlanet();
            wheelDeltaAccumulator = 0;
        } else if (wheelDeltaAccumulator < -35) { // Swipe / scroll UP or RIGHT -> Prev Tab
            goPrevPlanet();
            wheelDeltaAccumulator = 0;
        }
    }, { passive: true });

    // 2. Touchscreen Swipe (Mobile / Tablet - Vertical + Horizontal)
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (e.changedTouches.length !== 1) return;
        const deltaX = e.changedTouches[0].clientX - swipeStartX;
        const deltaY = e.changedTouches[0].clientY - swipeStartY;
        const timeElapsed = Date.now() - swipeStartTime;

        if (timeElapsed < 1200) {
            // Check whichever direction was swiped further (vertical or horizontal)
            if (Math.abs(deltaY) >= Math.abs(deltaX) && Math.abs(deltaY) > 35) {
                if (deltaY < 0) {
                    goNextPlanet(); // Swipe UP (scroll down) -> Next Tab
                } else {
                    goPrevPlanet(); // Swipe DOWN (scroll up) -> Prev Tab
                }
            } else if (Math.abs(deltaX) > 35) {
                if (deltaX < 0) {
                    goNextPlanet(); // Swipe LEFT -> Next Tab
                } else {
                    goPrevPlanet(); // Swipe RIGHT -> Prev Tab
                }
            }
        }
    }, { passive: true });

    // 3. Desktop Mouse / Pointer Drag Swipe (Vertical + Horizontal)
    let isPointerDown = false;
    window.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || e.button !== 0) return;
        isPointerDown = true;
        swipeStartX = e.clientX;
        swipeStartY = e.clientY;
        swipeStartTime = Date.now();
    });

    window.addEventListener('pointerup', (e) => {
        if (!isPointerDown || e.pointerType === 'touch') return;
        isPointerDown = false;
        const deltaX = e.clientX - swipeStartX;
        const deltaY = e.clientY - swipeStartY;
        const timeElapsed = Date.now() - swipeStartTime;

        if (timeElapsed < 1200) {
            if (Math.abs(deltaY) >= Math.abs(deltaX) && Math.abs(deltaY) > 40) {
                if (deltaY < 0) {
                    goNextPlanet(); // Drag UP -> Next Tab
                } else {
                    goPrevPlanet(); // Drag DOWN -> Prev Tab
                }
            } else if (Math.abs(deltaX) > 40) {
                if (deltaX < 0) {
                    goNextPlanet(); // Drag LEFT -> Next Tab
                } else {
                    goPrevPlanet(); // Drag RIGHT -> Prev Tab
                }
            }
        }
    });

    // 4. Keyboard Navigation (Down/Right = Next, Up/Left = Prev)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            goNextPlanet();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            goPrevPlanet();
        }
    });
});
