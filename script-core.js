document.addEventListener('DOMContentLoaded', () => {
    const MENU_TRANSITION_MS = 450;
    // ==========================================
    // SÉLECTION DES ÉLÉMENTS DOM
    // ==========================================
    const btn = document.getElementById('menu-toggle');
    const baselineWrapper = document.getElementById('baseline-wrapper');
    const menuWrapper = document.getElementById('menu-wrapper');
    const typewriter = document.getElementById('typewriter');
    const themeToggles = Array.from(
        document.querySelectorAll('#theme-toggle')
    );
    const cursor = document.getElementById('custom-cursor');
    const baseElementsToHide = Array.from(document.querySelectorAll('.menu-hide'));
    const mobileExtraHideSelectors = [
        '.content-top-section .title-group',
        '.projects-list-section',
        '.footer-group'
    ];

    const getMenuTransitionElements = () => {
        const elements = [...baseElementsToHide];
        const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;

        if (isMobileViewport) {
            mobileExtraHideSelectors.forEach((selector) => {
                document.querySelectorAll(selector).forEach((element) => {
                    if (!element.classList.contains('menu-hide')) {
                        element.classList.add('menu-hide');
                    }
                    elements.push(element);
                });
            });
        }

        return Array.from(new Set(elements)).filter((element) => (
            element &&
            !element.closest('.menu-overlay')
        ));
    };
    const isHomePage = document.body.classList.contains('home-page');
    const firstVisitLoader = document.getElementById('first-visit-loader');
    const firstVisitLoaderCount = document.getElementById('first-visit-loader-count');
    const homeLoaderStorageKey = window.__homeLoaderStorageKey || 'home-loader-seen-v1';
    const shouldRunHomeLoader = Boolean(
        isHomePage &&
        window.__showHomeFirstLoader === true &&
        firstVisitLoader &&
        firstVisitLoaderCount
    );
    const homePageRoot = document.querySelector('.home-page .page');
    const root = document.documentElement;
    const rennesTimes = Array.from(document.querySelectorAll('.footer-local-time'));

    // Le texte du typewriter est ecrit dans le HTML (lisible sans JS par Google et
    // les IA) ; on le lit une fois ici, avant que l'animation ne le decoupe en mots.
    const typewriterSource = typewriter
        ? (typewriter.dataset.text || typewriter.innerHTML).replace(/<br\s*\/?>/gi, '<br>').trim()
        : '';

    // ==========================================
    // HORLOGE LOCALE (RENNES)
    // ==========================================
    function startRennesClock() {
        if (rennesTimes.length === 0) return;

        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Europe/Paris'
        });

        // Les secondes defilent verticalement facon compteur (le procede de
        // NumberFlow) : chaque chiffre est une bande de ses valeurs possibles
        // qu'on translate. La bande se termine par un doublon du premier chiffre,
        // pour que le passage de 9 a 0 roule vers l'avant comme les autres au
        // lieu de rembobiner ; on recale ensuite sur le vrai 0 sans transition.
        const ROLL_MS = 450;
        const DIZAINES = ['0', '1', '2', '3', '4', '5', '0'];
        const UNITES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

        const buildDigit = (glyphs) => {
            const cell = document.createElement('span');
            cell.className = 'clock-digit';
            const strip = document.createElement('span');
            strip.className = 'clock-digit-strip is-instant';
            glyphs.forEach((glyph) => {
                const num = document.createElement('span');
                num.className = 'clock-digit-num';
                num.textContent = glyph;
                strip.append(num);
            });
            cell.append(strip);
            return { cell, strip, wrapAt: glyphs.length - 1, value: null, resetId: 0 };
        };

        const setDigit = (digit, value) => {
            if (digit.value === value) return;
            const first = digit.value === null;
            // On vise le doublon de fin quand on repasse par 0, sauf au tout
            // premier rendu ou il n'y a rien a faire rouler.
            const target = (value === 0 && !first) ? digit.wrapAt : value;
            digit.value = value;

            digit.strip.classList.toggle('is-instant', first);
            digit.strip.style.setProperty('--n', target);

            window.clearTimeout(digit.resetId);
            if (target === digit.wrapAt) {
                digit.resetId = window.setTimeout(() => {
                    digit.strip.classList.add('is-instant');
                    digit.strip.style.setProperty('--n', 0);
                    // Sans ce reflow, retirer la classe dans la meme frame
                    // laisserait la transition rejouer le retour en arriere.
                    void digit.strip.offsetWidth;
                    digit.strip.classList.remove('is-instant');
                }, ROLL_MS);
            } else if (first) {
                void digit.strip.offsetWidth;
                digit.strip.classList.remove('is-instant');
            }
        };

        // Le deux-points fait partie du groupe des secondes : masque aux lecteurs
        // d'ecran, l'heure se lit "01:52 PM" et non "01:52: <bande de chiffres>".
        const clocks = rennesTimes.map((timeElement) => {
            timeElement.textContent = '';
            const before = document.createTextNode('');
            const seconds = document.createElement('span');
            seconds.className = 'clock-seconds';
            seconds.setAttribute('aria-hidden', 'true');
            const colon = document.createElement('span');
            colon.className = 'clock-colon';
            colon.textContent = ':';
            const dizaines = buildDigit(DIZAINES);
            const unites = buildDigit(UNITES);
            seconds.append(colon, dizaines.cell, unites.cell);
            const after = document.createTextNode('');
            timeElement.append(before, seconds, after);
            return { before, after, dizaines, unites };
        });

        const partValue = (parts, type) => {
            const part = parts.find((candidate) => candidate.type === type);
            return part ? part.value : '';
        };

        const renderRennesTime = () => {
            const parts = formatter.formatToParts(new Date());
            const beforeValue = `${partValue(parts, 'hour')}:${partValue(parts, 'minute')}`;
            const secondsValue = partValue(parts, 'second').padStart(2, '0');
            const dayPeriod = partValue(parts, 'dayPeriod');
            const afterValue = dayPeriod ? ` ${dayPeriod}` : '';

            clocks.forEach((clock) => {
                if (clock.before.nodeValue !== beforeValue) clock.before.nodeValue = beforeValue;
                if (clock.after.nodeValue !== afterValue) clock.after.nodeValue = afterValue;
                setDigit(clock.dizaines, Number(secondsValue[0]));
                setDigit(clock.unites, Number(secondsValue[1]));
            });
        };

        renderRennesTime();
        const initialDelay = 1000 - (Date.now() % 1000);
        window.setTimeout(() => {
            renderRennesTime();
            window.setInterval(renderRennesTime, 1000);
        }, initialDelay);
    }

    startRennesClock();

    // ==========================================
    // ANIMATION TYPEWRITER
    // ==========================================
    function animateText() {
        if (!typewriter) return;

        typewriter.innerHTML = typewriterSource
            .split(/(\s+|<br>)/)
            .map(part => {
                if (part === '<br>') return '<br>';
                if (part.trim() === '') return part;
                return `<span class="word">${part}</span>`;
            })
            .join('');
        typewriter.classList.remove('is-pending');

        typewriter.querySelectorAll('.word').forEach((word, index) => {
            setTimeout(() => word.classList.add('visible'), index * 80);
        });
    }

    const startTypewriterAnimation = () => {
        if (!typewriter) return;
        window.setTimeout(animateText, 1000);
    };

    const createCubicBezierEasing = (p1x, p1y, p2x, p2y) => {
        const cx = 3 * p1x;
        const bx = 3 * (p2x - p1x) - cx;
        const ax = 1 - cx - bx;
        const cy = 3 * p1y;
        const by = 3 * (p2y - p1y) - cy;
        const ay = 1 - cy - by;

        const sampleCurveX = (t) => ((ax * t + bx) * t + cx) * t;
        const sampleCurveY = (t) => ((ay * t + by) * t + cy) * t;
        const sampleDerivativeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

        const solveCurveX = (x) => {
            let t = x;
            for (let i = 0; i < 8; i += 1) {
                const xError = sampleCurveX(t) - x;
                if (Math.abs(xError) < 1e-6) return t;
                const derivative = sampleDerivativeX(t);
                if (Math.abs(derivative) < 1e-6) break;
                t -= xError / derivative;
            }

            let tMin = 0;
            let tMax = 1;
            t = x;

            for (let i = 0; i < 12; i += 1) {
                const xValue = sampleCurveX(t);
                if (Math.abs(xValue - x) < 1e-6) return t;
                if (xValue < x) tMin = t;
                else tMax = t;
                t = (tMax - tMin) * 0.5 + tMin;
            }

            return t;
        };

        return (x) => sampleCurveY(solveCurveX(Math.min(Math.max(x, 0), 1)));
    };

    const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const SCRAMBLE_DURATION_MS = 1600;
    const SCRAMBLE_STAGGER_MS = 600;
    const PAGE_SCRAMBLE_STAGGER_MS = 240;
    const MENU_SCRAMBLE_DURATION_MS = 650;
    const MENU_SCRAMBLE_STAGGER_MS = 120;
    const SCRAMBLE_FRAME_INTERVAL_MS = 45;
    const SCRAMBLE_PAUSE_CHANCE = 0.18;
    const SCRAMBLE_PAUSE_MIN_MS = 35;
    const SCRAMBLE_PAUSE_MAX_MS = 120;
    const SCRAMBLE_PUNCTUATION = /[\s.,!?;:'"()\-]/;
    const SCRAMBLE_WHITESPACE = /\s/;
    const getRandomScrambleChar = () => {
        const randomIndex = Math.floor(Math.random() * SCRAMBLE_CHARS.length);
        return SCRAMBLE_CHARS[randomIndex];
    };
    const toDisplayChar = (char) => (SCRAMBLE_WHITESPACE.test(char) ? '\u00A0' : char);

    const scrambleText = (element, finalText, durationMs = SCRAMBLE_DURATION_MS) => {
        if (!element) return Promise.resolve();
        const targetText = finalText ?? '';
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || targetText.length === 0) {
            element.textContent = targetText;
            return Promise.resolve();
        }

        const startTime = performance.now();
        let lastRenderTime = startTime;
        let pauseUntil = startTime;
        const targetChars = Array.from(targetText);

        const fragment = document.createDocumentFragment();
        const charSpans = targetChars.map((char) => {
            const span = document.createElement('span');
            span.className = 'scramble-char';
            if (SCRAMBLE_PUNCTUATION.test(char)) {
                span.classList.add('is-revealed');
                span.textContent = toDisplayChar(char);
            } else {
                span.textContent = getRandomScrambleChar();
            }
            fragment.appendChild(span);
            return span;
        });

        element.textContent = '';
        element.appendChild(fragment);

        return new Promise((resolve) => {
            const tick = (now) => {
                if (now < pauseUntil) {
                    window.requestAnimationFrame(tick);
                    return;
                }
                if (now - lastRenderTime < SCRAMBLE_FRAME_INTERVAL_MS) {
                    window.requestAnimationFrame(tick);
                    return;
                }
                lastRenderTime = now;

                const progress = Math.min((now - startTime) / durationMs, 1);
                const revealCount = Math.floor(targetChars.length * progress);

                for (let i = 0; i < targetChars.length; i += 1) {
                    const char = targetChars[i];
                    const span = charSpans[i];
                    if (!span) continue;

                    if (i < revealCount || SCRAMBLE_PUNCTUATION.test(char)) {
                        span.textContent = toDisplayChar(char);
                        span.classList.add('is-revealed');
                    } else {
                        span.textContent = getRandomScrambleChar();
                        span.classList.remove('is-revealed');
                    }
                }

                if (progress >= 1) {
                    element.textContent = targetText;
                    resolve();
                    return;
                }

                if (Math.random() < SCRAMBLE_PAUSE_CHANCE) {
                    const pauseDuration = SCRAMBLE_PAUSE_MIN_MS +
                        Math.random() * (SCRAMBLE_PAUSE_MAX_MS - SCRAMBLE_PAUSE_MIN_MS);
                    pauseUntil = now + pauseDuration;
                }

                window.requestAnimationFrame(tick);
            };

            window.requestAnimationFrame(tick);
        });
    };

    const waitMs = (duration) => new Promise((resolve) => {
        window.setTimeout(resolve, duration);
    });

    // Seul enfant tolere dans un titre brouille : le complement reserve aux
    // lecteurs d'ecran (.sr-only).
    const isScrambleDecoration = (child) => child.matches('.sr-only');

    const getPageIntroScrambleElements = () => {
        const selector = '.page h1, .page h2, .page h3, .page .section-title, .page .subtitle, .page .location';
        return Array.from(document.querySelectorAll(selector)).filter((element) => {
            if (element.id === 'typewriter' || element.classList.contains('footer-local-time')) return false;
            if (element.closest('#menu-wrapper')) return false;
            if (element.closest('.project-item')) return false;
            if (element.classList.contains('no-scramble')) return false;
            if (Array.from(element.children).some((child) => !isScrambleDecoration(child))) return false;
            const text = element.textContent?.trim() || '';
            return text.length > 0;
        });
    };

    // Avec un enfant .sr-only, on brouille chaque noeud texte dans un span
    // temporaire, puis on remet le texte d'origine : le complement reste en place.
    const scrambleElement = (element) => {
        if (element.children.length === 0) {
            return scrambleText(element, element.textContent || '');
        }
        const textNodes = Array.from(element.childNodes).filter((node) => (
            node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ''
        ));
        return Promise.all(textNodes.map((node) => {
            const text = node.textContent;
            const holder = document.createElement('span');
            node.replaceWith(holder);
            return scrambleText(holder, text).then(() => {
                holder.replaceWith(document.createTextNode(text));
            });
        }));
    };

    const menuScrambleElements = Array.from(document.querySelectorAll('#menu-wrapper .menu-list a'));
    menuScrambleElements.forEach((element) => {
        if (!element.dataset.scrambleText) {
            element.dataset.scrambleText = element.textContent || '';
        }
    });
    let menuScrambleRunId = 0;

    const runMenuTextScramble = () => {
        if (menuScrambleElements.length === 0) return;
        const runId = ++menuScrambleRunId;

        menuScrambleElements.forEach((element, index) => {
            const targetText = element.dataset.scrambleText || element.textContent || '';
            waitMs(index * MENU_SCRAMBLE_STAGGER_MS).then(() => {
                if (runId !== menuScrambleRunId) return;
                return scrambleText(element, targetText, MENU_SCRAMBLE_DURATION_MS);
            });
        });
    };

    const runPageIntroScramble = async (withPageReveal = false, staggerMs = SCRAMBLE_STAGGER_MS) => {
        const revealTargets = [];
        const revealElements = getPageIntroScrambleElements();

        if (withPageReveal && homePageRoot) {
            homePageRoot.classList.add('intro-reveal');
            homePageRoot.classList.remove('intro-reveal-active');
            homePageRoot.getBoundingClientRect();
            requestAnimationFrame(() => {
                homePageRoot.classList.add('intro-reveal-active');
            });
        }

        revealElements.forEach((element, index) => {
            const delay = index * staggerMs;
            revealTargets.push(
                waitMs(delay).then(() => scrambleElement(element))
            );
        });
        startTypewriterAnimation();

        await Promise.all(revealTargets);

        if (withPageReveal && homePageRoot) {
            window.setTimeout(() => {
                homePageRoot.classList.remove('intro-reveal');
                homePageRoot.classList.remove('intro-reveal-active');
            }, SCRAMBLE_DURATION_MS + Math.max(revealElements.length - 1, 0) * staggerMs);
        }
    };

    const runHomeFirstVisitLoader = () => {
        if (!firstVisitLoader || !firstVisitLoaderCount) {
            document.documentElement.classList.remove('first-visit-loading');
            startTypewriterAnimation();
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const loadingDurationMs = prefersReducedMotion ? 700 : 3400;
        const easeProgress = createCubicBezierEasing(0.22, 1, 0.36, 1);
        const startTime = performance.now();
        let renderedValue = -1;

        const finishLoader = () => {
            firstVisitLoaderCount.textContent = '100%';
            window.__showHomeFirstLoader = false;
            try {
                sessionStorage.setItem(homeLoaderStorageKey, '1');
            } catch (_error) {
                // Ignore storage errors and continue UX flow.
            }

            window.setTimeout(() => {
                document.documentElement.classList.remove('first-visit-loading');
                firstVisitLoader.remove();
                window.dispatchEvent(new CustomEvent('home-loader-complete'));
                runPageIntroScramble(true, SCRAMBLE_STAGGER_MS);
            }, 60);
        };

        const tick = (currentTime) => {
            const rawProgress = Math.min((currentTime - startTime) / loadingDurationMs, 1);
            const easedProgress = easeProgress(rawProgress);
            const nextValue = Math.max(renderedValue, Math.round(easedProgress * 100));
            if (nextValue !== renderedValue) {
                renderedValue = Math.min(nextValue, 100);
                firstVisitLoaderCount.textContent = `${renderedValue}%`;
            }

            if (rawProgress >= 1) {
                finishLoader();
                return;
            }

            window.requestAnimationFrame(tick);
        };

        window.requestAnimationFrame(tick);
    };

    if (shouldRunHomeLoader) runHomeFirstVisitLoader();
    else {
        document.documentElement.classList.remove('first-visit-loading');
        startTypewriterAnimation();
        runPageIntroScramble(
            isHomePage,
            isHomePage ? SCRAMBLE_STAGGER_MS : PAGE_SCRAMBLE_STAGGER_MS
        );
    }

    // ==========================================
    // GESTION DU MENU BURGER
    // ==========================================
    let menuOverlay = null;
    const setMenuA11yState = (isOpen) => {
        if (!btn) return;
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    if (btn && menuWrapper?.id) {
        btn.setAttribute('aria-controls', menuWrapper.id);
    }
    setMenuA11yState(false);

    if (menuWrapper) {
        menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuWrapper.parentNode?.insertBefore(menuOverlay, menuWrapper);
        menuOverlay.appendChild(menuWrapper);
        menuOverlay.addEventListener('click', (event) => {
            if (event.target === menuOverlay && btn?.classList.contains('active')) {
                btn.classList.remove('active');
                setMenuA11yState(false);
                closeMenu();
            }
        });
    }

    function showMenuWithTransition() {
        if (menuOverlay) menuOverlay.style.display = 'flex';
        if (!menuWrapper) return;
        menuWrapper.style.display = 'block';
        menuWrapper.classList.add('hidden-state');
        // Force a layout flush so the "from" state is painted before we remove it.
        menuWrapper.getBoundingClientRect();
        requestAnimationFrame(() => {
            menuWrapper.classList.remove('hidden-state');
            runMenuTextScramble();
        });
    }

    let menuTransitionTimer = 0;
    const clearMenuTransitionTimer = () => {
        if (!menuTransitionTimer) return;
        window.clearTimeout(menuTransitionTimer);
        menuTransitionTimer = 0;
    };

    const revealPageContent = (restartTypewriter = false) => {
        const elementsToHide = getMenuTransitionElements();

        if (baselineWrapper) {
            baselineWrapper.style.display = 'block';
            baselineWrapper.classList.add('hidden-state');
        }
        elementsToHide.forEach((el) => el.classList.add('hidden-state'));

        requestAnimationFrame(() => {
            // Ensure hidden state is painted before revealing, to keep fade-in smooth.
            baselineWrapper?.getBoundingClientRect();
            elementsToHide.forEach((el) => el.getBoundingClientRect());

            requestAnimationFrame(() => {
                baselineWrapper?.classList.remove('hidden-state');
                elementsToHide.forEach((el) => el.classList.remove('hidden-state'));
                if (restartTypewriter) animateText();
            });
        });

        window.setTimeout(() => {
            document.body.classList.remove('menu-reveal');
        }, MENU_TRANSITION_MS);
    };

    function openMenu() {
        const elementsToHide = getMenuTransitionElements();

        clearMenuTransitionTimer();
        setMenuA11yState(true);
        if (baselineWrapper) baselineWrapper.style.display = 'block';
        baselineWrapper?.classList.add('hidden-state');
        elementsToHide.forEach(el => el.classList.add('hidden-state'));
        document.body.classList.add('menu-is-open');
        document.body.classList.remove('menu-reveal');

        menuTransitionTimer = window.setTimeout(() => {
            if (baselineWrapper) baselineWrapper.style.display = 'none';
            showMenuWithTransition();
            menuTransitionTimer = 0;
        }, MENU_TRANSITION_MS);
    }

    function closeMenu() {
        menuScrambleRunId += 1;
        clearMenuTransitionTimer();
        setMenuA11yState(false);
        menuWrapper?.classList.add('hidden-state');
        document.body.classList.remove('menu-is-open');
        document.body.classList.add('menu-reveal');

        menuTransitionTimer = window.setTimeout(() => {
            if (menuWrapper) menuWrapper.style.display = 'none';
            if (menuOverlay) menuOverlay.style.display = 'none';
            revealPageContent(true);
            menuTransitionTimer = 0;
        }, MENU_TRANSITION_MS);
    }

    btn?.addEventListener('click', () => {
        btn.classList.toggle('active');
        const isOpen = btn.classList.contains('active');
        isOpen ? openMenu() : closeMenu();
    });

    // ==========================================
    // BOUTONS MAGNETIQUES (facon perappelgren.de)
    // ==========================================
    // A l'approche du curseur, le bouton glisse vers lui, et son contenu un peu
    // plus encore : il a l'air de "regarder" la souris. Le mouvement suit une
    // interpolation par frame, donc il garde de l'inertie a l'arrivee comme au
    // retour. Souris uniquement, et rien si le visiteur reduit les animations.
    // Le burger et les boutons marques .is-magnetic (son des videos) l'ont.
    const makeMagnetic = (element, innerSelector) => {
        const MAGNET_RADIUS = 36;   // distance au centre ou l'attraction commence
        const MAGNET_PULL = 0.15;   // part de l'ecart curseur/centre suivie par le bouton
        const INNER_PULL = 0.06;    // supplement pour le contenu, effet de profondeur
        const MAGNET_EASE = 0.1;

        const inner = Array.from(element.querySelectorAll(innerSelector));
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let magnetFrame = 0;

        const renderMagnet = () => {
            currentX += (targetX - currentX) * MAGNET_EASE;
            currentY += (targetY - currentY) * MAGNET_EASE;

            const settled = Math.abs(targetX - currentX) < 0.05 && Math.abs(targetY - currentY) < 0.05;
            if (settled) {
                currentX = targetX;
                currentY = targetY;
            }

            element.style.translate = `${currentX}px ${currentY}px`;
            const innerX = currentX * (INNER_PULL / MAGNET_PULL);
            const innerY = currentY * (INNER_PULL / MAGNET_PULL);
            inner.forEach((child) => {
                child.style.translate = `${innerX}px ${innerY}px`;
            });

            magnetFrame = settled ? 0 : requestAnimationFrame(renderMagnet);
        };

        const startMagnet = () => {
            if (!magnetFrame) magnetFrame = requestAnimationFrame(renderMagnet);
        };

        window.addEventListener('pointermove', (event) => {
            // Centre de repos : le rect inclut le decalage courant, on le retire.
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2 - currentX;
            const centerY = rect.top + rect.height / 2 - currentY;
            const dx = event.clientX - centerX;
            const dy = event.clientY - centerY;
            const inRange = Math.hypot(dx, dy) < MAGNET_RADIUS;

            const nextX = inRange ? dx * MAGNET_PULL : 0;
            const nextY = inRange ? dy * MAGNET_PULL : 0;
            if (nextX === targetX && nextY === targetY) return;
            targetX = nextX;
            targetY = nextY;
            startMagnet();
        }, { passive: true });

        document.documentElement.addEventListener('pointerleave', () => {
            targetX = 0;
            targetY = 0;
            startMagnet();
        });
    };

    if (
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        if (btn) makeMagnetic(btn, '.bar');
        document.querySelectorAll('.is-magnetic').forEach((element) => makeMagnetic(element, 'svg, .case-video-sound-label'));
    }

    // ==========================================
    // DARK MODE
    // ==========================================
    let currentIsDark = root.classList.contains('dark-theme');
    themeToggles.forEach((toggle) => {
        toggle.checked = currentIsDark;
    });

    function applyTheme(isDark) {
        currentIsDark = isDark;
        root.classList.toggle('dark-theme', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggles.forEach((toggle) => {
            toggle.checked = isDark;
        });
    }

    // Écouteur sur le changement de thème
    themeToggles.forEach((toggle) => {
        toggle.addEventListener('change', () => {
            applyTheme(toggle.checked);
        });
    });

    // Raccourci clavier: Shift + D
    document.addEventListener('keydown', (event) => {
        if (!event.shiftKey || event.key.toLowerCase() !== 'd') return;
        const target = event.target;
        const isTypingContext =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target?.isContentEditable;
        if (isTypingContext) return;
        event.preventDefault();
        applyTheme(!currentIsDark);
    });

    // ==========================================
    // CURSEUR PERSONNALISÉ (THROTTLED)
    // ==========================================
    if (cursor) {
        const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!hasFinePointer) {
            document.documentElement.classList.remove('has-custom-cursor');
            cursor.style.display = 'none';
        } else {
            document.documentElement.classList.add('has-custom-cursor');
            let mouseX = -100;
            let mouseY = -100;
            let rafId = 0;
            let cursorHasAppeared = false;
            let hasKnownCursorPosition = false;
            const cursorStorageKey = 'custom-cursor-state-v1';
            const cursorPersistThrottleMs = 180;
            let cursorPersistTimeoutId = 0;
            let cursorStateDirty = false;
            const interactiveSelector = 'a, button, label, .menu-burger, .toggle-control, .project-item';
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const isLoaderInitiallyActive = document.documentElement.classList.contains('first-visit-loading');
            const isCursorHoverEligible = (element) => {
                if (!(element instanceof HTMLElement)) return false;
                if (element.classList.contains('contact-submit')) {
                    const isDisabled = element.disabled || element.getAttribute('aria-disabled') === 'true';
                    const isEnabledClass = element.classList.contains('is-enabled');
                    return !isDisabled && isEnabledClass;
                }
                return true;
            };

            const renderCursor = () => {
                cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
                rafId = 0;
            };

            const showCursor = ({ animate = true } = {}) => {
                cursorHasAppeared = true;
                if (!animate || prefersReducedMotion) {
                    cursor.classList.add('is-visible', 'is-no-motion');
                    return;
                }

                cursor.classList.remove('is-no-motion');
                cursor.classList.remove('is-visible');
                // Force reflow to replay keyframes when retriggered.
                void cursor.offsetWidth;
                cursor.classList.add('is-visible');
            };

            const persistCursorState = () => {
                try {
                    sessionStorage.setItem(cursorStorageKey, JSON.stringify({
                        x: mouseX,
                        y: mouseY,
                        visible: cursorHasAppeared
                    }));
                } catch (_error) {
                    // Ignore storage errors silently (private mode / storage disabled).
                }
            };

            const flushCursorState = () => {
                if (!cursorStateDirty) return;
                cursorStateDirty = false;
                if (cursorPersistTimeoutId) {
                    window.clearTimeout(cursorPersistTimeoutId);
                    cursorPersistTimeoutId = 0;
                }
                persistCursorState();
            };

            const scheduleCursorStatePersist = () => {
                cursorStateDirty = true;
                if (cursorPersistTimeoutId) return;
                cursorPersistTimeoutId = window.setTimeout(() => {
                    cursorPersistTimeoutId = 0;
                    flushCursorState();
                }, cursorPersistThrottleMs);
            };

            try {
                const rawState = sessionStorage.getItem(cursorStorageKey);
                if (rawState) {
                    const parsedState = JSON.parse(rawState);
                    const hasStoredPosition = Number.isFinite(parsedState?.x) && Number.isFinite(parsedState?.y);
                    if (hasStoredPosition && parsedState.visible === true) {
                        mouseX = parsedState.x;
                        mouseY = parsedState.y;
                        hasKnownCursorPosition = true;
                        if (isLoaderInitiallyActive) {
                        } else {
                            showCursor({ animate: false });
                        }
                        renderCursor();
                    }
                }
            } catch (_error) {
                // Ignore malformed/blocked storage values.
            }

            window.addEventListener('pointermove', (event) => {
                if (!cursorHasAppeared) {
                    const isLoaderActive = document.documentElement.classList.contains('first-visit-loading');
                    if (isLoaderActive) {
                    } else {
                        showCursor({ animate: true });
                    }
                }
                mouseX = event.clientX;
                mouseY = event.clientY;
                hasKnownCursorPosition = true;
                scheduleCursorStatePersist();
                if (rafId) return;
                rafId = window.requestAnimationFrame(renderCursor);
            }, { passive: true });

            window.addEventListener('pagehide', () => {
                flushCursorState();
            }, { passive: true });
            window.addEventListener('home-loader-complete', () => {
                if (!hasKnownCursorPosition) {
                    mouseX = window.innerWidth * 0.5;
                    mouseY = window.innerHeight * 0.5;
                    hasKnownCursorPosition = true;
                    renderCursor();
                }
                window.setTimeout(() => {
                    showCursor({ animate: true });
                    scheduleCursorStatePersist();
                }, 1000);
            }, { passive: true });

            document.querySelectorAll(interactiveSelector).forEach((element) => {
                element.addEventListener('pointerenter', () => {
                    if (!isCursorHoverEligible(element)) {
                        cursor.classList.remove('hovered');
                        return;
                    }
                    cursor.classList.add('hovered');
                });
                element.addEventListener('pointerleave', () => cursor.classList.remove('hovered'));
            });
        }
    }

    if (
        document.body.classList.contains('about-page') ||
        document.body.classList.contains('contact-page') ||
        document.body.classList.contains('case-page')
    ) {
        const radialCtaButtons = document.querySelectorAll(
            '.about-page .btn-download, .contact-page .contact-submit, .case-page .btn-download'
        );

        const setCtaRippleVars = (button, clientX, clientY) => {
            const rect = button.getBoundingClientRect();
            const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
            const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);

            const radius = Math.max(
                Math.hypot(x, y),
                Math.hypot(rect.width - x, y),
                Math.hypot(x, rect.height - y),
                Math.hypot(rect.width - x, rect.height - y)
            );

            button.style.setProperty('--cta-ripple-x', `${x}px`);
            button.style.setProperty('--cta-ripple-y', `${y}px`);
            button.style.setProperty('--cta-ripple-size', `${Math.ceil(radius * 2)}px`);
        };

        const isButtonInteractive = (button) => {
            if (button.classList.contains('contact-submit')) {
                return button.classList.contains('is-enabled') && !button.disabled;
            }
            return !button.classList.contains('is-disabled');
        };

        radialCtaButtons.forEach((button) => {
            if (!button.querySelector('.btn-label')) {
                const label = document.createElement('span');
                label.className = 'btn-label';
                while (button.firstChild) {
                    label.appendChild(button.firstChild);
                }
                button.appendChild(label);
            }

            button.addEventListener('pointerenter', (event) => {
                if (!isButtonInteractive(button)) return;
                setCtaRippleVars(button, event.clientX, event.clientY);
                button.classList.add('is-radial-hover');
            });

            button.addEventListener('pointerleave', (event) => {
                setCtaRippleVars(button, event.clientX, event.clientY);
                button.classList.remove('is-radial-hover');
            });

            button.addEventListener('focus', () => {
                if (!isButtonInteractive(button)) return;
                const rect = button.getBoundingClientRect();
                setCtaRippleVars(button, rect.left + rect.width / 2, rect.top + rect.height / 2);
                button.classList.add('is-radial-hover');
            });

            button.addEventListener('blur', () => {
                button.classList.remove('is-radial-hover');
            });
        });
    }

    // Bouton (About) ou lien de liste (page Siko) : tout lien qui porte une
    // URL desktop, et eventuellement mobile.
    const adaptivePrototypeButtons = Array.from(
        document.querySelectorAll('a[data-desktop-url]')
    );
    if (adaptivePrototypeButtons.length > 0) {
        const isMobilePrototypeContext = () => (
            window.matchMedia('(max-width: 900px)').matches ||
            window.matchMedia('(hover: none) and (pointer: coarse)').matches
        );

        const syncPrototypeHref = () => {
            const useMobileUrl = isMobilePrototypeContext();
            adaptivePrototypeButtons.forEach((button) => {
                const desktopUrl = button.getAttribute('data-desktop-url')?.trim();
                const mobileUrl = button.getAttribute('data-mobile-url')?.trim() || '';
                const hasMobileUrl = Boolean(mobileUrl && mobileUrl !== '#');
                if (!desktopUrl) return;

                if (useMobileUrl && !hasMobileUrl) {
                    button.setAttribute('href', '#');
                    button.classList.add('is-disabled');
                    button.setAttribute('aria-disabled', 'true');
                    button.setAttribute('tabindex', '-1');
                    return;
                }

                button.setAttribute('href', useMobileUrl ? mobileUrl : desktopUrl);
                button.classList.remove('is-disabled');
                button.removeAttribute('aria-disabled');
                button.removeAttribute('tabindex');
            });
        };

        syncPrototypeHref();
        window.addEventListener('resize', syncPrototypeHref, { passive: true });
        adaptivePrototypeButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                if (button.classList.contains('is-disabled')) {
                    event.preventDefault();
                }
            });
        });
    }

});
