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
                    
                    setTimeout(() => {
                        contentCard.classList.add('visible');
                    }, 600);
                }
            })
            .to(flashOverlay, {
                opacity: 0,
                duration: 1.5,
                ease: "power2.inOut"
            });
    });

    /**
     * NAVIGATION ROUTER
     */
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pageKey = e.currentTarget.getAttribute('data-page');
            if (!pageData[pageKey] || e.currentTarget.classList.contains('active')) return;

            navButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            contentCard.classList.remove('visible');

            flyToPlanet(pageKey, 2.2);

            setTimeout(() => {
                const data = pageData[pageKey];
                document.getElementById('planet-label').textContent = data.badge;
                document.getElementById('page-title').textContent = data.title;
                document.getElementById('page-body').innerHTML = data.body;
                document.getElementById('planet-coords').textContent = data.coords;

                contentCard.classList.add('visible');
            }, 800); 
        });
    });
});
