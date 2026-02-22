window.addEventListener('load', () => {
    // ==========================================
    // CARROUSEL PROJET
    // ==========================================
    const carousels = document.querySelectorAll('[data-carousel]');
    carousels.forEach(carousel => {
        const slides = carousel.querySelector('.project-slides');
        const dotsContainer = carousel.querySelector('.project-dots');
        const prev = carousel.querySelector('.project-arrow.prev');
        const next = carousel.querySelector('.project-arrow.next');
        let index = 0;
        let isAnimating = false;
        const total = slides?.children.length || 0;

        const renderDots = () => {
            if (!dotsContainer) return;
            dotsContainer.innerHTML = '';
            for (let i = 0; i < total; i++) {
                const dot = document.createElement('span');
                dot.className = `project-dot${i === index ? ' is-active' : ''}`;
                dot.addEventListener('click', () => updateCarousel(i));
                dotsContainer.appendChild(dot);
            }
        };

        function updateCarousel(newIndex) {
            if (!slides || total === 0) return;
            if (isAnimating) return;
            isAnimating = true;
            index = (newIndex + total) % total;
            slides.style.transform = `translateX(-${index * 100}%)`;
            renderDots();
            window.setTimeout(() => {
                isAnimating = false;
            }, 520);
        }

        prev?.addEventListener('click', () => updateCarousel(index - 1));
        next?.addEventListener('click', () => updateCarousel(index + 1));
        updateCarousel(0);
    });

    // ==========================================
    // LIGHTBOX PROJET
    // ==========================================
    const lightbox = document.createElement('div');
    lightbox.className = 'project-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.setAttribute('tabindex', '-1');
    lightbox.innerHTML = `
        <div class="project-lightbox-inner">
            <button class="project-lightbox-close" type="button" aria-label="Fermer">×</button>
            <img src="" alt="">
        </div>
        <div class="project-lightbox-controls">
            <div class="project-carousel-pill">
                <div class="project-dots" aria-hidden="true"></div>
                <div class="project-arrows">
                    <button class="project-arrow prev" type="button" aria-label="Image précédente">
                        <img src="fichiers/chevron-darkmode.svg" alt="" aria-hidden="true" class="arrow-light">
                        <img src="fichiers/Chevron.svg" alt="" aria-hidden="true" class="arrow-dark">
                    </button>
                    <button class="project-arrow next" type="button" aria-label="Image suivante">
                        <img src="fichiers/chevron-darkmode.svg" alt="" aria-hidden="true" class="arrow-light">
                        <img src="fichiers/Chevron.svg" alt="" aria-hidden="true" class="arrow-dark">
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector('img');
    const lightboxDots = lightbox.querySelector('.project-dots');
    const lightboxPrev = lightbox.querySelector('.project-arrow.prev');
    const lightboxNext = lightbox.querySelector('.project-arrow.next');
    const lightboxClose = lightbox.querySelector('.project-lightbox-close');
    const slideImages = Array.from(document.querySelectorAll('.project-slide img'));
    let lightboxIndex = 0;
    let isLightboxOpen = false;
    let lastFocusedElement = null;

    const getFocusableElements = () => {
        return Array.from(lightbox.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex=\"-1\"])'))
            .filter(el => !el.hasAttribute('disabled'));
    };

    const renderLightboxDots = () => {
        if (!lightboxDots) return;
        lightboxDots.innerHTML = slideImages
            .map((_, i) => `<span class="project-dot ${i === lightboxIndex ? 'is-active' : ''}"></span>`)
            .join('');
        lightboxDots.querySelectorAll('.project-dot').forEach((dot, i) => {
            dot.addEventListener('click', () => setLightboxIndex(i));
        });
    };

    const setLightboxIndex = (newIndex) => {
        const total = slideImages.length;
        if (total === 0) return;
        lightboxIndex = (newIndex + total) % total;
        const img = slideImages[lightboxIndex];
        if (lightboxImage && img) {
            lightboxImage.src = img.src;
            lightboxImage.alt = img.alt || '';
        }
        renderLightboxDots();
    };

    const openLightbox = (src, alt) => {
        if (!lightboxImage) return;
        lastFocusedElement = document.activeElement;
        const index = slideImages.findIndex(img => img.src === src);
        lightboxIndex = index >= 0 ? index : 0;
        setLightboxIndex(lightboxIndex);
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        isLightboxOpen = true;
        window.requestAnimationFrame(() => {
            lightboxClose?.focus();
        });
    };

    const closeLightbox = () => {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        isLightboxOpen = false;
        if (lastFocusedElement instanceof HTMLElement) {
            lastFocusedElement.focus();
        }
    };

    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    lightboxClose?.addEventListener('click', closeLightbox);

    lightboxPrev?.addEventListener('click', () => setLightboxIndex(lightboxIndex - 1));
    lightboxNext?.addEventListener('click', () => setLightboxIndex(lightboxIndex + 1));

    document.addEventListener('keydown', (event) => {
        if (!isLightboxOpen) return;
        if (event.key === 'Escape') {
            closeLightbox();
            return;
        }
        if (event.key === 'Tab') {
            const focusable = getFocusableElements();
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    slideImages.forEach(img => {
        img.addEventListener('click', (event) => {
            event.stopPropagation();
            openLightbox(img.src, img.alt);
        });
    });
});
