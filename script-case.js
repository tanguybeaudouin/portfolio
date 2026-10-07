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
    // VIDEOS : chargees et lues seulement quand elles sont a l'ecran
    // ==========================================
    // preload="none" dans le HTML : rien n'est telecharge tant qu'une video
    // n'approche pas. Hors ecran, elle est mise en pause. Mouvement reduit :
    // on s'en tient a l'affiche.
    const videos = document.querySelectorAll('.case-video');
    if (videos.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(({ target, isIntersecting }) => {
                if (isIntersecting) {
                    target.play().catch(() => {});
                } else {
                    target.pause();
                }
            });
        }, { threshold: 0.25 });
        videos.forEach((video) => videoObserver.observe(video));
    }

    // ==========================================
    // MAQUETTES CODEES : mises a l'echelle de leur cadre
    // ==========================================
    // La scene garde les dimensions de la maquette (largeur en px dans le CSS)
    // et suit la largeur du cadre via --mock-scale.
    const mocks = document.querySelectorAll('.case-mock');
    if (mocks.length && 'ResizeObserver' in window) {
        const mockObserver = new ResizeObserver((entries) => {
            entries.forEach(({ target, contentRect }) => {
                const stage = target.firstElementChild;
                if (!stage || !stage.offsetWidth) return;
                target.style.setProperty('--mock-scale', String(contentRect.width / stage.offsetWidth));
            });
        });
        mocks.forEach((mock) => mockObserver.observe(mock));
    }

    // ==========================================
    // CHIFFRES QUI DEFILENT (maquettes codees)
    // ==========================================
    // <span data-count="1240" data-suffix=" €"> : le chiffre monte de 0 a sa
    // valeur quand il arrive a l'ecran. Le texte d'origine reste en place
    // sans JS ou si le visiteur reduit les animations.
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
        const formatCount = (el, value) => {
            const digits = String(value).padStart(Number(el.dataset.pad) || 0, '0');
            // Espaces des milliers ordinaires, comme dans la maquette.
            const number = digits.length > 3 && !el.dataset.pad
                ? Number(digits).toLocaleString('fr-FR').replace(/\s/g, ' ')
                : digits;
            return (el.dataset.prefix || '') + number + (el.dataset.suffix || '');
        };
        const runCounter = (el) => {
            const target = Number(el.dataset.count);
            const duration = 1400;
            const start = performance.now() + 900; // apres l'entree du cadre
            const tick = (now) => {
                const t = Math.min(Math.max((now - start) / duration, 0), 1);
                const eased = 1 - Math.pow(1 - t, 3);
                el.textContent = formatCount(el, Math.round(target * eased));
                if (t < 1) requestAnimationFrame(tick);
            };
            el.textContent = formatCount(el, 0);
            requestAnimationFrame(tick);
        };
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                counterObserver.unobserve(entry.target);
                runCounter(entry.target);
            });
        }, { threshold: 0.2 });
        counters.forEach((el) => counterObserver.observe(el));
    }

    // ==========================================
    // SON DES VIDEOS : coupe par defaut, active au clic
    // ==========================================
    // Les videos demarrent muettes (seule condition pour la lecture auto). Le
    // bouton retablit le son ; hors ecran la video se met en pause comme les
    // autres, et reprend avec le son a son retour.
    document.querySelectorAll('.case-video-sound').forEach((button) => {
        const soundVideo = button.closest('.case-media')?.querySelector('.case-video');
        if (!soundVideo) {
            button.hidden = true;
            return;
        }
        const render = () => {
            const on = !soundVideo.muted;
            button.setAttribute('aria-pressed', String(on));
            button.setAttribute('aria-label', on ? 'Couper le son de la vidéo' : 'Activer le son de la vidéo');
        };
        button.addEventListener('click', () => {
            soundVideo.muted = !soundVideo.muted;
            if (!soundVideo.muted && soundVideo.paused) soundVideo.play().catch(() => {});
            render();
        });
        soundVideo.addEventListener('volumechange', render);
        render();
    });

    // ==========================================
    // LIGHTBOX : l'image grandit depuis sa place, le burger devient la croix
    // ==========================================
    // Animation FLIP : l'image agrandie est posee a sa taille finale, puis on
    // l'anime depuis le rectangle du visuel d'origine. Le burger du header passe
    // en croix ; un clic dessus ferme l'image au lieu d'ouvrir le menu (ecoute
    // en capture sur le document, donc avant le gestionnaire de script-core.js).
    const lightbox = document.querySelector('.case-lightbox');
    const lightboxFrame = lightbox?.querySelector('.case-lightbox-frame');
    const lightboxImg = lightbox?.querySelector('.case-lightbox-img');
    const burger = document.getElementById('menu-toggle');
    const ZOOM_MS = 520;
    const ZOOM_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
    let sourceImg = null;
    let zoomAnimation = null;

    // Transformation qui ramene le cadre agrandi sur le cadre d'origine.
    const transformFromSource = () => {
        const from = sourceImg.closest('.case-media').getBoundingClientRect();
        const to = lightboxFrame.getBoundingClientRect();
        const scale = from.width / to.width;
        const dx = from.left - to.left;
        const dy = from.top + (from.height - to.height * scale) / 2 - to.top;
        return `translate(${dx}px, ${dy}px) scale(${scale})`;
    };

    const openLightbox = async (img) => {
        if (sourceImg) return;
        sourceImg = img;
        lightboxImg.src = img.currentSrc || img.src;
        lightboxImg.alt = img.alt;
        // decode() peut tarder (onglet en arriere-plan, grosse image) : on ne
        // l'attend pas plus de 300ms, sinon le clic semble ignore.
        await Promise.race([
            lightboxImg.decode().catch(() => {}),
            new Promise((resolve) => setTimeout(resolve, 300)),
        ]);

        lightbox.classList.remove('is-closing');
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
        document.documentElement.style.overflow = 'hidden';
        burger?.classList.add('active');
        burger?.setAttribute('aria-label', "Fermer l'image");

        if (prefersReducedMotion) {
            img.closest('.case-media').classList.add('is-zoom-source');
            return;
        }
        zoomAnimation?.cancel();
        zoomAnimation = lightboxFrame.animate(
            [{ transform: transformFromSource() }, { transform: 'none' }],
            { duration: ZOOM_MS, easing: ZOOM_EASE }
        );
        img.closest('.case-media').classList.add('is-zoom-source');
    };

    const closeLightbox = () => {
        if (!sourceImg || !lightbox.classList.contains('is-open')) return;
        const img = sourceImg;

        lightbox.classList.remove('is-open');
        lightbox.classList.add('is-closing');
        lightbox.setAttribute('aria-hidden', 'true');
        burger?.classList.remove('active');
        burger?.setAttribute('aria-label', 'Menu');

        const finish = () => {
            img.closest('.case-media').classList.remove('is-zoom-source');
            lightbox.classList.remove('is-closing');
            document.body.classList.remove('lightbox-open');
            document.documentElement.style.overflow = '';
            lightboxImg.removeAttribute('src');
            sourceImg = null;
        };

        if (prefersReducedMotion) {
            finish();
            return;
        }
        zoomAnimation?.cancel();
        zoomAnimation = lightboxFrame.animate(
            [{ transform: 'none' }, { transform: transformFromSource() }],
            { duration: ZOOM_MS * 0.8, easing: ZOOM_EASE, fill: 'forwards' }
        );
        // Filet de securite : si l'onglet passe en arriere-plan, l'animation
        // est gelee et ne se termine jamais ; la lightbox resterait bloquee.
        const closing = zoomAnimation;
        let closed = false;
        const done = () => {
            if (closed || zoomAnimation !== closing) return;
            closed = true;
            finish();
            closing.cancel();
        };
        closing.finished.then(done).catch(() => {});
        setTimeout(done, ZOOM_MS + 150);
    };

    if (lightbox && lightboxFrame && lightboxImg) {
        document.querySelectorAll('.case-media > img').forEach((img) => {
            img.addEventListener('click', () => openLightbox(img));
        });
        lightbox.addEventListener('click', closeLightbox);

        document.addEventListener('click', (event) => {
            if (!sourceImg || !burger?.contains(event.target)) return;
            event.stopPropagation();
            closeLightbox();
        }, true);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeLightbox();
        });
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
