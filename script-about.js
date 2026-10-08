/* ==========================================
   REVEAL DU TEXTE AU SCROLL (mobile) — facon pages projets
   Chaque mot du texte d'intro part en gris 50% et passe en sombre quand il
   franchit une ligne de lecture (~62% de la hauteur visible).
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

/* ==========================================
   HAUTEURS DU HEADER / FOOTER
   ==========================================
   La zone de defilement remonte sous le header et descend sous le footer par
   des marges negatives, et rend l'espace par un padding egal : le contenu
   glisse donc dessous pour se dissoudre dans le flou, sans que header et footer
   entrent eux-memes dans le defilement (voir about.css, ZONE DE DEFILEMENT).

   Leurs hauteurs ne sont pas figees : le h1 est en clamp() sous 900px, et le
   footer se replie en deux lignes. On les publie en variables plutot que de les
   coder en dur, et on resynchronise au resize comme au chargement des polices,
   qui change la hauteur du texte apres le premier rendu. */
(() => {
    if (!document.body.classList.contains('about-page')) return;

    const section = document.querySelector('.content-section');
    const header = document.querySelector('.content-top-section');
    const footer = document.querySelector('.footer-group');
    if (!section || !header || !footer) return;

    const sync = () => {
        section.style.setProperty('--about-header-h', `${header.offsetHeight}px`);
        section.style.setProperty('--about-footer-h', `${footer.offsetHeight}px`);
    };

    sync();

    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(sync);
        observer.observe(header);
        observer.observe(footer);
    } else {
        window.addEventListener('resize', sync, { passive: true });
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(sync).catch(() => {});
    }
})();
