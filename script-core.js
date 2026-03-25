document.addEventListener('DOMContentLoaded', () => {
    const MENU_TRANSITION_MS = 450;
    // ==========================================
    // SÉLECTION DES ÉLÉMENTS DOM
    // ==========================================
    const btn = document.getElementById('menu-toggle');
    const baselineWrapper = document.getElementById('baseline-wrapper');
    const menuWrapper = document.getElementById('menu-wrapper');
    const typewriter = document.getElementById('typewriter');
    const themeToggle = document.getElementById('theme-toggle');
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

    // Éléments pour la superposition d'images
    const portraitLight = document.querySelector('.portrait-light');
    const root = document.documentElement;
    const rennesTime = document.getElementById('rennes-time');

    const defaultTypewriterText = "Hello, moi c'est Tanguy.<br>Je conçois des expériences digitales inclusives,<br>Éco-conçues et garanties sans frustration utilisateur.";

    // ==========================================
    // HORLOGE LOCALE (RENNES)
    // ==========================================
    function startRennesClock() {
        if (!rennesTime) return;

        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Europe/Paris'
        });

        const renderRennesTime = () => {
            rennesTime.textContent = formatter.format(new Date());
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
            if (element.id === 'typewriter' || element.id === 'rennes-time') return false;
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
    const menuHoverScrambling = new WeakSet();
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

    const scrambleMenuItemOnHover = (element) => {
        if (!element || menuHoverScrambling.has(element)) return;
        const targetText = element.dataset.scrambleText || element.textContent || '';
        menuHoverScrambling.add(element);
        scrambleText(element, targetText, MENU_SCRAMBLE_DURATION_MS).finally(() => {
            menuHoverScrambling.delete(element);
        });
    };

    menuScrambleElements.forEach((element) => {
        element.addEventListener('pointerenter', () => scrambleMenuItemOnHover(element));
        element.addEventListener('focusin', () => scrambleMenuItemOnHover(element));
    });

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
    if (menuWrapper) {
        menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuWrapper.parentNode?.insertBefore(menuOverlay, menuWrapper);
        menuOverlay.appendChild(menuWrapper);
        menuOverlay.addEventListener('click', (event) => {
            if (event.target === menuOverlay && btn?.classList.contains('active')) {
                btn.classList.remove('active');
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
    if (themeToggle) themeToggle.checked = isDarkInitial;
    updateThemeUI(isDarkInitial, false);

    function applyTheme(isDark, animate = true) {
        currentIsDark = isDark;
        root.classList.toggle('dark-theme', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (themeToggle) themeToggle.checked = isDark;
        updateThemeUI(isDark, animate);
    }

    // Écouteur sur le changement de thème
    themeToggle?.addEventListener('change', () => {
        applyTheme(themeToggle.checked, true);
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
            cursor.style.display = 'none';
        } else {
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

    if (document.body.classList.contains('about-page') || document.body.classList.contains('contact-page')) {
        const radialCtaButtons = document.querySelectorAll('.about-page .btn-download, .contact-page .contact-submit');

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
            return true;
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
});
