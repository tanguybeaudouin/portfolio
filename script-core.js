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
        document.querySelectorAll('#theme-toggle, #theme-toggle-bottom')
    );
    const cursor = document.getElementById('custom-cursor');
    const baseElementsToHide = Array.from(document.querySelectorAll('.menu-hide'));
    const mobileExtraHideSelectors = [
        '.content-top-section .title-group',
        '.image-section',
        '.projects-gallery-section',
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
    const isProjectPage = (
        document.body.classList.contains('project-fbf-page') ||
        document.body.classList.contains('project-2-page')
    );
    const isProjectFbfPage = document.body.classList.contains('project-fbf-page');
    const isClassicProjectPage = document.body.classList.contains('project-2-page');
    const projectTransitionStorageKey = 'project-page-transition-pending-v1';
    const projectTransitionDurationMs = 220;
    const projectEnterAnimationDurationMs = 780;
    let isProjectTransitionRunning = false;
    const isProjectPathname = (pathname) => /\/project-(?:fbf|\d+)\.html$/i.test(pathname);
    let projectSmoother = null;

    const initProjectScrollSmoother = () => {
        window.__projectSmoother = null;
        if (!isProjectPage) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
        if (prefersReducedMotion || isMobileViewport) return;
        if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined' || typeof window.ScrollSmoother === 'undefined') return;

        const smoothWrapper = document.getElementById('smooth-wrapper');
        const smoothContent = document.getElementById('smooth-content');
        if (!smoothWrapper || !smoothContent) return;

        if (isClassicProjectPage) {
            document.querySelectorAll('.project2-gallery-item .project2-visual').forEach((visual, index) => {
                if (visual.hasAttribute('data-speed')) return;
                visual.setAttribute('data-speed', index % 2 === 0 ? '0.96' : '0.92');
            });
        }

        window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollSmoother);
        projectSmoother = window.ScrollSmoother.create({
            wrapper: smoothWrapper,
            content: smoothContent,
            smooth: 1,
            smoothTouch: false,
            normalizeScroll: true,
            effects: true
        });
        window.__projectSmoother = projectSmoother;
    };

    const destroyProjectScrollSmoother = () => {
        if (!projectSmoother) return;
        if (typeof projectSmoother.kill === 'function') {
            projectSmoother.kill();
        }
        projectSmoother = null;
        window.__projectSmoother = null;
    };

    const triggerProjectPageTransition = (targetUrl, { projectToProject = false } = {}) => {
        if (!targetUrl || isProjectTransitionRunning) return false;
        isProjectTransitionRunning = true;
        projectSmoother?.paused(false);
        destroyProjectScrollSmoother();

        if (projectToProject) {
            try {
                sessionStorage.setItem(projectTransitionStorageKey, '1');
            } catch (_error) {
                // Ignore storage errors and continue with transition.
            }
        }

        document.body.classList.add('is-project-transitioning-will-change');
        document.body.classList.add('is-project-transitioning');
        document.body.classList.add('is-project-transitioning-critical');

        window.setTimeout(() => {
            document.body.classList.remove('is-project-transitioning-critical');
        }, 140);

        window.setTimeout(() => {
            window.location.href = targetUrl;
        }, projectTransitionDurationMs);

        return true;
    };

    if (isProjectPage) {
        let shouldPlayProjectEnter = false;
        try {
            shouldPlayProjectEnter = sessionStorage.getItem(projectTransitionStorageKey) === '1';
            if (shouldPlayProjectEnter) {
                sessionStorage.removeItem(projectTransitionStorageKey);
            }
        } catch (_error) {
            // Ignore storage errors and fallback to no enter animation.
        }

        if (shouldPlayProjectEnter) {
            document.body.classList.add('is-project-entering-will-change');
            document.body.classList.add('is-project-entering-from-project');
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    document.body.classList.remove('is-project-entering-from-project');
                    document.body.classList.remove('is-project-entering-will-change');
                    document.documentElement.classList.remove('project-transition-enter');
                });
            });
            window.setTimeout(() => {
                initProjectScrollSmoother();
            }, projectEnterAnimationDurationMs + 40);
        } else {
            document.documentElement.classList.remove('project-transition-enter');
            initProjectScrollSmoother();
        }

        document.addEventListener('click', (event) => {
            const eventTarget = event.target;
            if (!(eventTarget instanceof Element)) return;
            const link = eventTarget.closest('a[href]');
            if (!(link instanceof HTMLAnchorElement)) return;
            if (link.target && link.target !== '_self') return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            let url = null;
            try {
                url = new URL(link.href, window.location.href);
            } catch (_error) {
                return;
            }

            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;
            if (!isProjectPathname(url.pathname)) return;

            event.preventDefault();
            triggerProjectPageTransition(url.pathname + url.search + url.hash, { projectToProject: true });
        });
    }

    // Éléments pour la superposition d'images
    const portraitLight = document.querySelector('.portrait-light');
    const root = document.documentElement;
    const rennesTimes = Array.from(document.querySelectorAll('.footer-local-time'));

    const defaultTypewriterText = "“Hello, moi c'est Tanguy.<br>Je conçois des expériences digitales inclusives,<br>Éco-conçues et garanties sans frustration utilisateur.”";

    // ==========================================
    // HORLOGE LOCALE (RENNES)
    // ==========================================
    function startRennesClock() {
        if (rennesTimes.length === 0) return;

        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Europe/Paris'
        });

        const renderRennesTime = () => {
            const timeValue = formatter.format(new Date());
            rennesTimes.forEach((timeElement) => {
                timeElement.textContent = timeValue;
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
        const textHTML = typewriter.dataset.text || defaultTypewriterText;

        typewriter.innerHTML = textHTML
            .split(/(\s+|<br>)/)
            .map(part => {
                if (part === '<br>') return '<br>';
                if (part.trim() === '') return part;
                return `<span class="word">${part}</span>`;
            })
            .join('');

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

    const getPageIntroScrambleElements = () => {
        const selector = '.page h1, .page h2, .page h3, .page .subtitle, .page .location';
        return Array.from(document.querySelectorAll(selector)).filter((element) => {
            if (element.id === 'typewriter' || element.classList.contains('footer-local-time')) return false;
            if (element.closest('#menu-wrapper')) return false;
            if (element.closest('.project-item')) return false;
            if (element.classList.contains('no-scramble')) return false;
            if (element.children.length > 0) return false;
            const text = element.textContent?.trim() || '';
            return text.length > 0;
        });
    };

    const menuScrambleElements = Array.from(document.querySelectorAll('#menu-wrapper .menu-list a'));
    const socialScrambleElements = Array.from(document.querySelectorAll('.contact-links a'));
    menuScrambleElements.forEach((element) => {
        if (!element.dataset.scrambleText) {
            element.dataset.scrambleText = element.textContent || '';
        }
    });
    socialScrambleElements.forEach((element) => {
        if (!element.dataset.scrambleText) {
            element.dataset.scrambleText = element.textContent || '';
        }
    });
    let menuScrambleRunId = 0;
    const socialHoverScrambling = new WeakSet();

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

    socialScrambleElements.forEach((element) => {
        element.addEventListener('pointerenter', () => {
            if (socialHoverScrambling.has(element)) return;
            const targetText = element.dataset.scrambleText || element.textContent || '';
            socialHoverScrambling.add(element);
            scrambleText(element, targetText, MENU_SCRAMBLE_DURATION_MS).finally(() => {
                socialHoverScrambling.delete(element);
            });
        });
    });

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
                waitMs(delay).then(() => scrambleText(element, element.textContent || ''))
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
        if (!isProjectFbfPage) {
            // Force a layout flush so the "from" state is painted before we remove it.
            menuWrapper.getBoundingClientRect();
        }
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

        if (isProjectFbfPage) {
            requestAnimationFrame(() => {
                baselineWrapper?.classList.remove('hidden-state');
                elementsToHide.forEach((el) => el.classList.remove('hidden-state'));
                if (restartTypewriter) animateText();
            });
        } else {
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
        }

        window.setTimeout(() => {
            document.body.classList.remove('menu-reveal');
        }, MENU_TRANSITION_MS);
    };

    function openMenu() {
        const elementsToHide = getMenuTransitionElements();

        clearMenuTransitionTimer();
        setMenuA11yState(true);
        projectSmoother?.paused(true);
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
            projectSmoother?.paused(false);
            menuTransitionTimer = 0;
        }, MENU_TRANSITION_MS);
    }

    btn?.addEventListener('click', () => {
        btn.classList.toggle('active');
        const isOpen = btn.classList.contains('active');
        isOpen ? openMenu() : closeMenu();
    });

    // ==========================================
    // DARK MODE & PORTRAIT (Technique de superposition)
    // ==========================================
    function updateThemeUI(isDark, animate = true) {
        if (portraitLight) {
            // Désactiver la transition si on ne veut pas d'animation (chargement page)
            portraitLight.style.transition = animate ? 'opacity 0.8s ease' : 'none';
            // On joue sur l'opacité de l'image de dessus (Light)
            portraitLight.style.opacity = isDark ? '0' : '1';
        }
    }
    let currentIsDark = root.classList.contains('dark-theme');

    // Initialisation immédiate sans animation
    const isDarkInitial = root.classList.contains('dark-theme');
    currentIsDark = isDarkInitial;
    themeToggles.forEach((toggle) => {
        toggle.checked = isDarkInitial;
    });
    updateThemeUI(isDarkInitial, false);

    function applyTheme(isDark, animate = true) {
        currentIsDark = isDark;
        root.classList.toggle('dark-theme', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggles.forEach((toggle) => {
            toggle.checked = isDark;
        });
        updateThemeUI(isDark, animate);
    }

    // Écouteur sur le changement de thème
    themeToggles.forEach((toggle) => {
        toggle.addEventListener('change', () => {
            applyTheme(toggle.checked, true);
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
        applyTheme(!currentIsDark, true);
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
                persistCursorState();
                if (rafId) return;
                rafId = window.requestAnimationFrame(renderCursor);
            }, { passive: true });

            window.addEventListener('pagehide', persistCursorState, { passive: true });
            window.addEventListener('home-loader-complete', () => {
                if (!hasKnownCursorPosition) {
                    mouseX = window.innerWidth * 0.5;
                    mouseY = window.innerHeight * 0.5;
                    hasKnownCursorPosition = true;
                    renderCursor();
                }
                window.setTimeout(() => {
                    showCursor({ animate: true });
                    persistCursorState();
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
        document.body.classList.contains('project-fbf-page')
    ) {
        const radialCtaButtons = document.querySelectorAll(
            '.about-page .btn-download, .contact-page .contact-submit, .project-fbf-page .fbf-sheet .btn-download'
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

    const adaptivePrototypeButtons = Array.from(
        document.querySelectorAll('.btn-download[data-desktop-url]')
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

    const initProjectImageLightbox = (images, { getPausedStateOnClose } = {}) => {
        if (!Array.isArray(images) || images.length === 0) return;

        const lightbox = document.createElement('button');
        lightbox.type = 'button';
        lightbox.className = 'fbf-lightbox';
        lightbox.setAttribute('aria-label', 'Fermer l’image plein écran');
        lightbox.setAttribute('aria-hidden', 'true');

        const lightboxImage = document.createElement('img');
        lightboxImage.className = 'fbf-lightbox-img';
        lightboxImage.decoding = 'async';
        lightboxImage.alt = '';
        lightbox.appendChild(lightboxImage);
        document.body.appendChild(lightbox);

        let activeSourceImage = null;

        const closeLightbox = () => {
            if (!lightbox.classList.contains('is-open')) return;
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('fbf-lightbox-open');
            if (projectSmoother && typeof projectSmoother.paused === 'function') {
                const shouldPause = typeof getPausedStateOnClose === 'function'
                    ? Boolean(getPausedStateOnClose())
                    : false;
                projectSmoother.paused(shouldPause);
            }
            activeSourceImage = null;
        };

        const openLightbox = (sourceImage) => {
            if (!sourceImage) return;
            const nextSource = sourceImage.currentSrc || sourceImage.src;
            if (!nextSource) return;

            lightboxImage.src = nextSource;
            lightboxImage.alt = sourceImage.alt || '';
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.classList.add('fbf-lightbox-open');
            if (projectSmoother && typeof projectSmoother.paused === 'function') {
                projectSmoother.paused(true);
            }
            activeSourceImage = sourceImage;
        };

        images.forEach((image) => {
            image.style.cursor = 'zoom-in';
            image.setAttribute('role', 'button');
            image.setAttribute('tabindex', '0');
            image.setAttribute('aria-label', `Ouvrir en plein écran : ${image.alt || 'image du projet'}`);

            image.addEventListener('click', () => {
                if (lightbox.classList.contains('is-open') && activeSourceImage === image) {
                    closeLightbox();
                    return;
                }
                openLightbox(image);
            });

            image.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (lightbox.classList.contains('is-open') && activeSourceImage === image) {
                    closeLightbox();
                    return;
                }
                openLightbox(image);
            });
        });

        lightbox.addEventListener('click', closeLightbox);
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeLightbox();
            }
        });
    };

    if (document.body.classList.contains('project-fbf-page')) {
        const heroSection = document.querySelector('.fbf-hero');
        const contactCtaFrame = document.querySelector('.fbf-contact-cta-frame');
        const heroLeadLines = Array.from(document.querySelectorAll('.fbf-lead-rest .fbf-line'));
        const introBlock = document.querySelector('.fbf-intro');
        const introLines = Array.from(document.querySelectorAll('.fbf-intro-animated .fbf-intro-line'));
        const nextPanel = document.querySelector('.fbf-blue-panel');
        const nextPanelLines = Array.from(document.querySelectorAll('.fbf-next-reveal .fbf-next-line'));
        const nextPanelArrow = document.querySelector('.fbf-next-reveal .fbf-next-arrow');
        const nextProjectUrl = nextPanel?.dataset.nextUrl || '';
        let hasTriggeredNextProject = false;
        let nextPanelProgress = 0;
        let nextPanelTargetProgress = 0;
        let bottomEdgeReachedAt = 0;
        let canNavigateAfterFullReveal = false;
        let isNextProjectScrollLocked = false;
        const bottomActivationDelayMs = 30;
        let requestLeadRevealUpdate = null;
        const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const easeOutSoft = (value) => 1 - Math.pow(1 - clamp01(value), 1.6);
        const getElementDocumentTop = (element) => {
            if (!element) return 0;
            let top = 0;
            let current = element;
            while (current) {
                top += current.offsetTop || 0;
                current = current.offsetParent;
            }
            return top;
        };
        const getCurrentScrollY = () => {
            if (projectSmoother && typeof projectSmoother.scrollTop === 'function') {
                return Math.max(projectSmoother.scrollTop(), 0);
            }
            return Math.max(window.scrollY, 0);
        };
        const getMaxScrollY = () => {
            if (window.ScrollTrigger && typeof window.ScrollTrigger.maxScroll === 'function') {
                return Math.max(window.ScrollTrigger.maxScroll(window), 0);
            }
            return Math.max(document.documentElement.scrollHeight - (window.innerHeight || 1), 0);
        };
        const setNextProjectScrollLock = (shouldLock) => {
            if (isNextProjectScrollLocked === shouldLock) return;
            isNextProjectScrollLocked = shouldLock;

            if (projectSmoother && typeof projectSmoother.paused === 'function') {
                projectSmoother.paused(shouldLock);
                if (shouldLock && typeof projectSmoother.scrollTop === 'function') {
                    projectSmoother.scrollTop(getMaxScrollY());
                }
            }
        };
        const navigateToNextProject = () => {
            if (!nextProjectUrl || hasTriggeredNextProject) return;
            setNextProjectScrollLock(false);
            const didStart = triggerProjectPageTransition(nextProjectUrl, { projectToProject: true });
            if (!didStart) return;
            hasTriggeredNextProject = true;
        };

        if (heroSection && heroLeadLines.length > 0) {
            let ticking = false;

            const applySequentialReveal = (lines, progress) => {
                const lineCount = lines.length || 1;
                lines.forEach((line, index) => {
                    const segmentStart = index / lineCount;
                    const segmentProgress = clamp01((progress - segmentStart) * lineCount);
                    const eased = segmentProgress * segmentProgress * (3 - (2 * segmentProgress));
                    line.style.setProperty('--line-reveal', `${(eased * 100).toFixed(2)}%`);
                });
            };

            heroLeadLines.forEach((line) => {
                line.setAttribute('data-text', (line.textContent || '').trim());
            });
            introLines.forEach((line) => {
                line.setAttribute('data-text', (line.textContent || '').trim());
            });
            nextPanelLines.forEach((line) => {
                line.setAttribute('data-text', (line.textContent || '').trim());
            });

            const updateLeadReveal = () => {
                ticking = false;
                nextPanelProgress += (nextPanelTargetProgress - nextPanelProgress) * 0.22;
                if (Math.abs(nextPanelTargetProgress - nextPanelProgress) < 0.0008) {
                    nextPanelProgress = nextPanelTargetProgress;
                }
                if (nextPanelProgress <= 0.0008 && nextPanelTargetProgress <= 0.0008) {
                    setNextProjectScrollLock(false);
                }
                const currentScrollY = getCurrentScrollY();
                const isAtTop = currentScrollY <= 4;
                const heroHeight = heroSection.offsetHeight || window.innerHeight || 1;
                const fadeDistance = heroHeight * 0.34;
                const scrolled = currentScrollY;
                const heroProgress = isAtTop ? 0 : clamp01(scrolled / fadeDistance);
                applySequentialReveal(heroLeadLines, heroProgress);

                if (introBlock && introLines.length > 0) {
                    let introProgress = 0;
                    if (!isAtTop) {
                        const introTop = getElementDocumentTop(introBlock);
                        const startY = window.innerHeight * 0.74;
                        const endY = window.innerHeight * 0.08;
                        const startScroll = introTop - startY;
                        const endScroll = introTop - endY;
                        const introRawProgress = clamp01((currentScrollY - startScroll) / Math.max(endScroll - startScroll, 1));
                        introProgress = introRawProgress * introRawProgress;
                    }
                    applySequentialReveal(introLines, introProgress);
                }

                if (isAtTop && (nextPanelProgress > 0.0008 || nextPanelTargetProgress > 0.0008)) {
                    nextPanelProgress = 0;
                    nextPanelTargetProgress = 0;
                    canNavigateAfterFullReveal = false;
                    hasTriggeredNextProject = false;
                    setNextProjectScrollLock(false);
                }

                if (nextPanel && nextPanelLines.length > 0) {
                    const textPhaseEnd = 0.44;
                    const textProgress = easeOutSoft(nextPanelProgress / textPhaseEnd);
                    const arrowProgress = easeOutSoft((nextPanelProgress - textPhaseEnd) / (1 - textPhaseEnd));

                    applySequentialReveal(nextPanelLines, textProgress);
                    if (nextPanelArrow) {
                        nextPanelArrow.style.setProperty('--line-reveal', `${(arrowProgress * 100).toFixed(2)}%`);
                    }

                }
            };

            requestLeadRevealUpdate = () => {
                if (ticking) return;
                ticking = true;
                window.requestAnimationFrame(updateLeadReveal);
            };

            updateLeadReveal();
            if (window.gsap && window.gsap.ticker) {
                const tickUpdate = () => requestLeadRevealUpdate();
                window.gsap.ticker.add(tickUpdate);
                window.addEventListener('pagehide', () => {
                    window.gsap.ticker.remove(tickUpdate);
                }, { once: true });
            }
            window.addEventListener('scroll', requestLeadRevealUpdate, { passive: true });
            window.addEventListener('resize', requestLeadRevealUpdate);
        }

        const lockEdgeOverscroll = (deltaY, event) => {
            const viewportHeight = window.innerHeight || 1;
            const maxScroll = getMaxScrollY();
            const scrollTop = getCurrentScrollY();
            const isAtBottom = scrollTop >= maxScroll - 1;
            const now = performance.now();
            const isNearBottom = (maxScroll - scrollTop) <= Math.max(220, viewportHeight * 0.2);
            const hasNextPanelProgress = (
                nextPanelTargetProgress > 0.0008 ||
                nextPanelProgress > 0.0008
            );
            const shouldHandleEdgeTransition = isNearBottom || hasNextPanelProgress;

            if (!shouldHandleEdgeTransition) return;

            if (!isAtBottom) {
                bottomEdgeReachedAt = 0;
            } else if (bottomEdgeReachedAt === 0) {
                bottomEdgeReachedAt = now;
            }

            if (deltaY < 0 && nextPanelLines.length > 0 && hasNextPanelProgress) {
                const progressDelta = Math.min(Math.abs(deltaY), 60) / 1000;
                const nextValue = clamp01(nextPanelTargetProgress - progressDelta);
                if (nextValue !== nextPanelTargetProgress) {
                    nextPanelTargetProgress = nextValue;
                    hasTriggeredNextProject = false;
                    canNavigateAfterFullReveal = false;
                    setNextProjectScrollLock(true);
                    requestLeadRevealUpdate?.();
                    event.preventDefault();
                    return;
                }
                if (nextPanelTargetProgress <= 0.0008) {
                    setNextProjectScrollLock(false);
                    return;
                }
                event.preventDefault();
                return;
            }

            if (deltaY > 0 && isAtBottom && nextPanelLines.length > 0 && !hasTriggeredNextProject) {
                if ((now - bottomEdgeReachedAt) < bottomActivationDelayMs) {
                    event.preventDefault();
                    return;
                }
                const progressDelta = Math.min(Math.abs(deltaY), 60) / 1000;
                const wasFullyRevealed = nextPanelTargetProgress >= 0.999;
                const nextValue = clamp01(nextPanelTargetProgress + progressDelta);
                if (nextValue !== nextPanelTargetProgress) {
                    nextPanelTargetProgress = nextValue;
                    setNextProjectScrollLock(true);
                    requestLeadRevealUpdate?.();
                }

                const isFullyRevealed = nextPanelTargetProgress >= 0.999;
                if (isFullyRevealed && !wasFullyRevealed) {
                    canNavigateAfterFullReveal = true;
                    event.preventDefault();
                    return;
                }

                if (isFullyRevealed && wasFullyRevealed && canNavigateAfterFullReveal && nextProjectUrl) {
                    navigateToNextProject();
                }

                event.preventDefault();
                return;
            }
        };

        window.addEventListener('wheel', (event) => {
            lockEdgeOverscroll(event.deltaY, event);
        }, { passive: false });

        let touchStartY = 0;
        window.addEventListener('touchstart', (event) => {
            const touch = event.touches?.[0];
            if (!touch) return;
            touchStartY = touch.clientY;
        }, { passive: true });

        window.addEventListener('touchmove', (event) => {
            const touch = event.touches?.[0];
            if (!touch) return;
            const deltaY = touchStartY - touch.clientY;
            lockEdgeOverscroll(deltaY, event);
        }, { passive: false });

        const canUseCtaParallax =
            window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (contactCtaFrame) {
            const setCtaPointer = (x, y) => {
                contactCtaFrame.style.setProperty('--pointer-x', String(clamp(x, -1, 1)));
                contactCtaFrame.style.setProperty('--pointer-y', String(clamp(y, -1, 1)));
            };

            const updateCtaPointer = (event) => {
                if (!canUseCtaParallax || !event) return;
                const rect = contactCtaFrame.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
                setCtaPointer(x, y);
            };

            const resetCtaPointer = () => setCtaPointer(0, 0);

            if (!canUseCtaParallax) {
                resetCtaPointer();
            } else {
                contactCtaFrame.addEventListener('pointerenter', updateCtaPointer);
                contactCtaFrame.addEventListener('pointermove', updateCtaPointer);
                contactCtaFrame.addEventListener('pointerleave', resetCtaPointer);
                contactCtaFrame.addEventListener('pointercancel', resetCtaPointer);
            }
        }

        const zoomableImages = Array.from(
            document.querySelectorAll('.fbf-sheet .fbf-media-frame .fbf-media-img')
        );
        initProjectImageLightbox(zoomableImages, {
            getPausedStateOnClose: () => isNextProjectScrollLocked
        });
    }

    if (document.body.classList.contains('project-2-page')) {
        const zoomableProjectTwoImages = Array.from(
            document.querySelectorAll('.project2-visual img')
        );
        initProjectImageLightbox(zoomableProjectTwoImages);
    }

});
