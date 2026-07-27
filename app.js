/**
 * NOVA BANK ACCOUNTS USA
 * Interactive Icon Showcase & Modal Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize 3D Space Background
    if (typeof initSpace === 'function') {
        initSpace();
    }

    const enterBtn = document.getElementById('enter-btn');
    const landingContainer = document.getElementById('landing-container');
    const mainContainer = document.getElementById('main-container');
    const flashOverlay = document.querySelector('.flash-overlay');

    // Modal elements
    const accountModal = document.getElementById('account-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalProceedBtn = document.getElementById('modal-proceed-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalBadge = document.getElementById('modal-badge');
    const modalDesc = document.getElementById('modal-desc');

    /**
     * LANDING TO MAIN TRANSITION (Supernova Azure Flash)
     */
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            if (typeof triggerSupernovaExplosion === 'function') {
                triggerSupernovaExplosion();
            }

            gsap.timeline()
                .to(flashOverlay, {
                    opacity: 1,
                    duration: 0.4,
                    ease: "expo.out",
                    onComplete: () => {
                        landingContainer.classList.add('hidden');
                        landingContainer.classList.remove('active');
                        mainContainer.classList.remove('hidden');

                        // Animate Icon Cards entering one after the other with staggering cyan glow
                        gsap.fromTo('.icon-card', 
                            { opacity: 0, y: 45, scale: 0.88 },
                            { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.14, ease: 'power3.out' }
                        );
                    }
                })
                .to(flashOverlay, {
                    opacity: 0,
                    duration: 1.4,
                    ease: "power2.inOut"
                });
        });
    }

    /**
     * ICON CARD INTERACTIVITY & MODAL POPUP
     */
    const iconCards = document.querySelectorAll('.icon-card');

    function openModal(title, badge, desc) {
        if (modalTitle) modalTitle.textContent = title || 'Verified Account';
        if (modalBadge) modalBadge.textContent = badge || 'VERIFIED ACCOUNT • READY';
        if (modalDesc) modalDesc.textContent = desc || 'Verified access ready for immediate deployment and delivery.';
        
        if (accountModal) {
            accountModal.classList.remove('hidden');
            gsap.fromTo('.modal-card',
                { y: 25, scale: 0.95, opacity: 0 },
                { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }
            );
        }
    }

    function closeModal() {
        if (!accountModal) return;
        gsap.to('.modal-card', {
            y: 20,
            scale: 0.95,
            opacity: 0,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                accountModal.classList.add('hidden');
            }
        });
    }

    iconCards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.getAttribute('data-title');
            const badge = card.getAttribute('data-badge');
            const desc = card.getAttribute('data-desc');
            openModal(title, badge, desc);
        });
    });

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeModal);
    }

    if (accountModal) {
        accountModal.addEventListener('click', (e) => {
            if (e.target === accountModal) {
                closeModal();
            }
        });
    }

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && accountModal && !accountModal.classList.contains('hidden')) {
            closeModal();
        }
    });
});
