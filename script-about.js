(() => {
    if (!document.body.classList.contains('about-page')) return;

    const spotlight = document.querySelector('.about-image');
    if (!spotlight) return;

    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarsePointer) {
        spotlight.classList.add('is-active');
        return;
    }

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const lerp = (from, to, alpha) => from + (to - from) * alpha;
    const HALO_RADIUS_PX = 165;
    const BASE_SPOT_SIZE = 150;
    const MAX_SPOT_SIZE = 235;

    let targetX = 50;
    let targetY = 50;
    let targetOpacity = 0;
    let targetSize = BASE_SPOT_SIZE;

    let currentX = 50;
    let currentY = 50;
    let currentOpacity = 0;
    let currentSize = BASE_SPOT_SIZE;
    let rafId = null;

    const render = () => {
        currentX = lerp(currentX, targetX, 0.18);
        currentY = lerp(currentY, targetY, 0.18);
        currentOpacity = lerp(currentOpacity, targetOpacity, 0.16);
        currentSize = lerp(currentSize, targetSize, 0.2);

        spotlight.style.setProperty('--spot-x', `${currentX}%`);
        spotlight.style.setProperty('--spot-y', `${currentY}%`);
        spotlight.style.setProperty('--spot-opacity', `${currentOpacity}`);
        spotlight.style.setProperty('--spot-size', `${currentSize}px`);

        const done =
            Math.abs(currentX - targetX) < 0.08 &&
            Math.abs(currentY - targetY) < 0.08 &&
            Math.abs(currentOpacity - targetOpacity) < 0.01 &&
            Math.abs(currentSize - targetSize) < 0.4;

        if (done) {
            rafId = null;
            return;
        }

        rafId = requestAnimationFrame(render);
    };

    const startRender = () => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(render);
    };

    const updateSpotlight = (clientX, clientY) => {
        const rect = spotlight.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;

        // Active le halo même quand le curseur est juste à côté de la zone image
        const nearestX = clamp(clientX, rect.left, rect.right);
        const nearestY = clamp(clientY, rect.top, rect.bottom);
        const dx = clientX - nearestX;
        const dy = clientY - nearestY;
        const distanceToCard = Math.hypot(dx, dy);

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        // Autorise un centre de halo légèrement hors-carte pour un reveal progressif
        targetX = clamp(x, -32, 132);
        targetY = clamp(y, -32, 132);

        const strength = clamp(1 - distanceToCard / HALO_RADIUS_PX, 0, 1);
        const smoothedStrength = Math.pow(strength, 1.4);
        targetOpacity = smoothedStrength;
        targetSize = BASE_SPOT_SIZE + (MAX_SPOT_SIZE - BASE_SPOT_SIZE) * smoothedStrength;
        startRender();
        return smoothedStrength > 0;
    };

    window.addEventListener('mousemove', (event) => {
        updateSpotlight(event.clientX, event.clientY);
    });

    spotlight.addEventListener('mouseleave', () => {
        targetOpacity = 0;
        targetSize = BASE_SPOT_SIZE;
        startRender();
    });
})();

/* ==========================================
   REVEAL DU TEXTE AU SCROLL (mobile) — facon pages projets
   Chaque mot du texte d'intro part en gris 50% et passe en sombre quand il
   franchit une ligne de lecture (~62% de la hauteur visible). IIFE distinct :
   celui du portrait sort tot sur pointeur tactile, il ne couvrirait pas ce cas.
   ========================================== */
(() => {
    if (!document.body.classList.contains('about-page')) return;
    if (!window.matchMedia('(max-width: 900px)').matches) return;

    const intro = document.querySelector('.about-text-content .intro-greeting');
    if (!intro) return;

    // Decoupe en <span class="reveal-char"> caractere par caractere. Les espaces
    // restent des noeuds texte (points de coupure de ligne + justification) ; sans
    // espace entre les spans d'un meme mot, le navigateur ne coupe pas au milieu.
    // Les caracteres avant le 1er <br> = 1re phrase "Hello…", toujours en noir.
    const chars = [];
    let firstSentenceCount = -1;
    const fragment = document.createDocumentFragment();
    Array.from(intro.childNodes).forEach((node) => {
        if (node.nodeName === 'BR') {
            if (firstSentenceCount === -1) firstSentenceCount = chars.length;
            fragment.appendChild(node.cloneNode(true));
            return;
        }
        if (node.nodeType !== Node.TEXT_NODE) {
            fragment.appendChild(node.cloneNode(true));
            return;
        }
        Array.from(node.textContent).forEach((ch) => {
            if (/\s/.test(ch)) {
                fragment.appendChild(document.createTextNode(ch));
                return;
            }
            const span = document.createElement('span');
            span.className = 'reveal-char';
            span.textContent = ch;
            fragment.appendChild(span);
            chars.push(span);
        });
    });
    if (firstSentenceCount === -1) firstSentenceCount = chars.length;
    intro.textContent = '';
    intro.appendChild(fragment);

    if (chars.length === 0) return;

    // Accessibilite : pas d'animation -> tout lisible d'emblee.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        chars.forEach((c) => c.classList.add('is-revealed'));
        return;
    }

    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
    // La 1re phrase est noire des le depart ; le reste se revele au scroll.
    let revealed = 0;
    const applyRevealed = (target) => {
        target = Math.max(firstSentenceCount, Math.min(target, chars.length));
        if (target === revealed) return;
        if (target > revealed) {
            for (let i = revealed; i < target; i += 1) chars[i].classList.add('is-revealed');
        } else {
            for (let i = target; i < revealed; i += 1) chars[i].classList.remove('is-revealed');
        }
        revealed = target;
    };
    applyRevealed(firstSentenceCount);

    const restTotal = chars.length - firstSentenceCount;
    let ticking = false;
    const updateReveal = () => {
        ticking = false;
        // Progression liee DIRECTEMENT au scroll (et non a la position du texte) :
        // des le 1er pixel scrolle, la revelation avance a partir de la 1re phrase,
        // sans temps mort du a la position basse du texte (grand blanc du hero).
        // La revelation du reste s'etale sur une distance = hauteur du texte.
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const revealDistance = intro.getBoundingClientRect().height || 1;
        const progress = clamp01(scrollY / revealDistance);
        applyRevealed(firstSentenceCount + Math.round(progress * restTotal));
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateReveal);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateReveal();
})();
