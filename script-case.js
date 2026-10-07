// Page projet (case-page) : apparition au defilement, video a la demande et
// agrandissement des visuels. Tout le reste (menu, theme, horloge, curseur,
// bouton prototype) vient de script-core.js.
(() => {
    if (!document.body.classList.contains('case-page')) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ==========================================
    // APPARITION AU DEFILEMENT
    // ==========================================
    const revealItems = document.querySelectorAll('.case-reveal');
    if (!('IntersectionObserver' in window)) {
        revealItems.forEach((item) => item.classList.add('is-in'));
    } else {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                revealObserver.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px' });
        revealItems.forEach((item) => revealObserver.observe(item));
    }

    // ==========================================
    // VIDEO : chargee et lue seulement quand elle est a l'ecran
    // ==========================================
    // preload="none" dans le HTML : rien n'est telecharge tant que la video
    // n'approche pas. Hors ecran, elle est mise en pause. Mouvement reduit :
    // on s'en tient a l'affiche.
    const video = document.querySelector('.case-video');
    if (video && !prefersReducedMotion && 'IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        }, { threshold: 0.25 }).observe(video);
    }

    // ==========================================
    // LIGHTBOX (dialog natif : Echap, focus et fond geres par le navigateur)
    // ==========================================
    const lightbox = document.querySelector('.case-lightbox');
    const lightboxImg = lightbox?.querySelector('.case-lightbox-img');
    if (lightbox && lightboxImg && typeof lightbox.showModal === 'function') {
        document.querySelectorAll('.case-media img').forEach((img) => {
            img.addEventListener('click', () => {
                lightboxImg.src = img.currentSrc || img.src;
                lightboxImg.alt = img.alt;
                lightbox.showModal();
            });
        });
        lightbox.addEventListener('click', () => lightbox.close());
    }

    // ==========================================
    // COPIE DU LIEN DE LA PAGE
    // ==========================================
    const copyButton = document.querySelector('.case-copy-link');
    const copyStatus = document.querySelector('.case-copy-status');
    if (copyButton && navigator.clipboard) {
        let copyTimer = 0;
        copyButton.addEventListener('click', () => {
            const url = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                copyButton.classList.add('is-copied');
                if (copyStatus) {
                    copyStatus.textContent = 'Lien copié';
                    copyStatus.classList.add('is-visible');
                }
                window.clearTimeout(copyTimer);
                copyTimer = window.setTimeout(() => {
                    copyButton.classList.remove('is-copied');
                    copyStatus?.classList.remove('is-visible');
                }, 1600);
            }).catch(() => {});
        });
    } else if (copyButton) {
        copyButton.hidden = true;
    }
})();
