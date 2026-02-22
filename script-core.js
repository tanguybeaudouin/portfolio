document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // SÉLECTION DES ÉLÉMENTS DOM
    // ==========================================
    const btn = document.getElementById('menu-toggle');
    const baselineWrapper = document.getElementById('baseline-wrapper');
    const menuWrapper = document.getElementById('menu-wrapper');
    const typewriter = document.getElementById('typewriter');
    const themeToggle = document.getElementById('theme-toggle');
    const cursor = document.getElementById('custom-cursor');
    const aboutSection = document.querySelector('.about-baseline-section');
    const elementsToHide = document.querySelectorAll('.menu-hide');

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

    if (typewriter) {
        setTimeout(animateText, 1000);
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

    function openMenu() {
        const isMobile = window.matchMedia('(max-width: 900px)').matches;
        baselineWrapper?.classList.add('hidden-state');
        elementsToHide.forEach(el => el.classList.add('hidden-state'));
        document.body.classList.add('menu-is-open');

        if (isMobile) {
            if (baselineWrapper) baselineWrapper.style.display = 'none';
            if (menuOverlay) menuOverlay.style.display = 'flex';
            if (menuWrapper) {
                menuWrapper.style.display = 'block';
                menuWrapper.classList.add('hidden-state');
                requestAnimationFrame(() => menuWrapper.classList.remove('hidden-state'));
            }
            return;
        }

        setTimeout(() => {
            if (baselineWrapper) baselineWrapper.style.display = 'none';
            aboutSection?.classList.add('menu-open');

            if (menuWrapper) {
                if (menuOverlay) menuOverlay.style.display = 'flex';
                menuWrapper.style.display = 'block';
                menuWrapper.classList.add('hidden-state');
                requestAnimationFrame(() => menuWrapper.classList.remove('hidden-state'));
            }
        }, 300);
    }

    function closeMenu() {
        const isMobile = window.matchMedia('(max-width: 900px)').matches;
        if (isMobile) {
            document.body.classList.remove('menu-is-open');
            document.body.classList.add('menu-reveal');
            aboutSection?.classList.remove('menu-open');
            menuWrapper?.classList.add('hidden-state');
            setTimeout(() => {
                if (menuWrapper) menuWrapper.style.display = 'none';
                if (menuOverlay) menuOverlay.style.display = 'none';
            }, 300);
            if (baselineWrapper) {
                baselineWrapper.style.display = 'block';
                baselineWrapper.classList.add('hidden-state');
            }
            elementsToHide.forEach(el => el.classList.add('hidden-state'));
            requestAnimationFrame(() => {
                document.body.classList.remove('menu-reveal');
                baselineWrapper?.classList.remove('hidden-state');
                elementsToHide.forEach(el => el.classList.remove('hidden-state'));
            });
            return;
        }

        menuWrapper?.classList.add('hidden-state');
        document.body.classList.remove('menu-is-open');

        setTimeout(() => {
            if (menuWrapper) menuWrapper.style.display = 'none';
            if (menuOverlay) menuOverlay.style.display = 'none';
            aboutSection?.classList.remove('menu-open');

            if (baselineWrapper) {
                baselineWrapper.style.display = 'block';
                baselineWrapper.classList.add('hidden-state');
            }

            elementsToHide.forEach(el => el.classList.remove('hidden-state'));

            requestAnimationFrame(() => {
                baselineWrapper?.classList.remove('hidden-state');
                animateText();
            });
        }, 300);
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

    // Écouteur sur le changement de thème
    themeToggle?.addEventListener('change', () => {
        const isDark = themeToggle.checked;
        currentIsDark = isDark;
        root.classList.toggle('dark-theme', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeUI(isDark, true);
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
            const interactiveSelector = 'a, button, label, .menu-burger, .toggle-control, .project-item';

            const renderCursor = () => {
                cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
                rafId = 0;
            };

            window.addEventListener('pointermove', (event) => {
                mouseX = event.clientX;
                mouseY = event.clientY;
                if (rafId) return;
                rafId = window.requestAnimationFrame(renderCursor);
            }, { passive: true });

            document.querySelectorAll(interactiveSelector).forEach((element) => {
                element.addEventListener('pointerenter', () => cursor.classList.add('hovered'));
                element.addEventListener('pointerleave', () => cursor.classList.remove('hovered'));
            });
        }
    }
});
