// ==========================================
// SOUND DESIGN — chargé sur toutes les pages
// ==========================================
// Tous les sons sont synthétisés en Web Audio : aucun fichier à charger.
// Bureau uniquement (souris) ; un interrupteur à côté de celui du thème, choix
// gardé dans localStorage. Les navigateurs bloquent l'audio avant le premier
// clic ou la première touche : les survols restent muets jusque-là.
// Style de l'interrupteur : section 13 de main.css.
(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!isFinePointer || !window.AudioContext) return;

        const STORAGE_KEY = 'sound';
        const readEnabled = () => {
            try {
                return localStorage.getItem(STORAGE_KEY) !== 'off';
            } catch {
                return true;
            }
        };
        let enabled = readEnabled();

        // ---------- Moteur ----------
        let ctx = null;
        let master = null;
        let noiseBuffer = null;

        const unlock = () => {
            if (!ctx) {
                ctx = new AudioContext();

                // Limiteur en bout de chaîne : pas de saturation si plusieurs
                // sons se superposent.
                const limiter = ctx.createDynamicsCompressor();
                limiter.threshold.value = -12;
                limiter.knee.value = 12;
                limiter.ratio.value = 6;
                limiter.attack.value = 0.005;
                limiter.release.value = 0.2;
                limiter.connect(ctx.destination);

                // Volume général : monte ou baisse tout sans changer l'équilibre.
                master = ctx.createGain();
                master.gain.value = 0.7;
                master.connect(limiter);

                noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
            }
            if (ctx.state === 'suspended') ctx.resume();
        };
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);

        const isReady = () => enabled && ctx && ctx.state === 'running';

        // Enveloppe courte : attaque linéaire, extinction exponentielle.
        const envelope = (start, attack, dur, peak) => {
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(peak, start + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            gain.connect(master);
            return gain;
        };

        const tone = ({ freq, freqEnd, type = 'sine', dur = 0.05, gain = 0.05, attack = 0.002, delay = 0 }) => {
            const start = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, start);
            if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
            osc.connect(envelope(start, attack, dur, gain));
            osc.start(start);
            osc.stop(start + dur + 0.02);
        };

        const noise = ({ freq, freqEnd, filter = 'bandpass', q = 1, dur = 0.05, gain = 0.05, attack = 0.002, delay = 0 }) => {
            const start = ctx.currentTime + delay;
            const src = ctx.createBufferSource();
            src.buffer = noiseBuffer;
            const biquad = ctx.createBiquadFilter();
            biquad.type = filter;
            biquad.Q.value = q;
            biquad.frequency.setValueAtTime(freq, start);
            if (freqEnd) biquad.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
            src.connect(biquad);
            biquad.connect(envelope(start, attack, dur, gain));
            src.start(start, Math.random() * 0.5);
            src.stop(start + dur + 0.02);
        };

        const jitter = (amount) => 1 + (Math.random() * 2 - 1) * amount;

        // ---------- Bibliothèque ----------
        let lastHoverAt = 0;
        const sounds = {
            // Frôlement : à peine audible, légère variation pour ne pas lasser.
            hover(pitch = 1) {
                const now = performance.now();
                if (now - lastHoverAt < 35) return;
                lastHoverAt = now;
                tone({ freq: 2100 * pitch * jitter(0.02), dur: 0.045, gain: 0.03 });
                noise({ freq: 7000, filter: 'highpass', dur: 0.018, gain: 0.012 });
            },
            // Tic sec : confirmation d'une action.
            click() {
                tone({ freq: 1500, freqEnd: 900, type: 'triangle', dur: 0.06, gain: 0.08 });
                noise({ freq: 2600, q: 1.5, dur: 0.03, gain: 0.05 });
            },
            // Souffle qui monte / qui descend : le menu s'ouvre ou se referme.
            menu(isOpen) {
                const [from, to] = isOpen ? [450, 2800] : [2800, 450];
                noise({ freq: from, freqEnd: to, q: 2.2, dur: 0.38, gain: 0.09, attack: 0.14 });
                tone({ freq: isOpen ? 523 : 784, freqEnd: isOpen ? 784 : 523, dur: 0.3, gain: 0.025, attack: 0.04 });
            },
            // Crépitement numérique calé sur le brouillage des lettres (images de 45 ms).
            scramble(durationMs) {
                const steps = Math.floor(durationMs / 45);
                for (let i = 0; i < steps; i += 1) {
                    const progress = i / steps;
                    if (Math.random() < progress * 0.6) continue; // se raréfie en fin de course
                    tone({
                        freq: 2800 + Math.random() * 3200,
                        type: 'square',
                        dur: 0.012,
                        gain: 0.006,
                        delay: (i * 45 + Math.random() * 15) / 1000,
                    });
                }
                tone({ freq: 1760, dur: 0.06, gain: 0.02, delay: durationMs / 1000 });
            },
            // Interrupteur de thème : deux notes, vers le bas pour le sombre.
            theme(isDark) {
                const [a, b] = isDark ? [880, 587] : [587, 880];
                tone({ freq: a, type: 'triangle', dur: 0.07, gain: 0.05 });
                tone({ freq: b, type: 'triangle', dur: 0.09, gain: 0.05, delay: 0.06 });
            },
            // Mots du typewriter de l'accueil : touches feutrées.
            word() {
                tone({ freq: 1200 * jitter(0.08), dur: 0.03, gain: 0.018 });
                noise({ freq: 3500, q: 0.8, dur: 0.02, gain: 0.01 });
            },
            soundOn() {
                [660, 880, 1320].forEach((freq, i) => {
                    tone({ freq, dur: 0.12, gain: 0.04, delay: i * 0.07 });
                });
            },
        };

        const play = (name, ...args) => {
            if (isReady()) sounds[name](...args);
        };

        const onMouseEnter = (element, handler) => {
            element.addEventListener('pointerenter', (event) => {
                if (event.pointerType === 'mouse') handler(event);
            });
        };

        // ---------- Interrupteur ----------
        // Un bouton à gauche de chaque interrupteur de thème (les pages projet
        // en ont deux : bas du hero et pied de page) ; tous restent synchronisés.
        const themeControls = Array.from(document.querySelectorAll('.toggle-control'));
        const soundButtons = themeControls.map((themeControl) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sound-toggle';
            button.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';

            const controls = document.createElement('div');
            controls.className = 'footer-controls';
            themeControl.parentNode.insertBefore(controls, themeControl);
            controls.append(button, themeControl);
            return button;
        });
        const bars = soundButtons.flatMap((button) => Array.from(button.children));

        // Égaliseur : chaque barre oscille à sa propre vitesse, l'amplitude
        // glisse vers 1 (son actif) ou vers 0 (coupé) pour que les barres se
        // dressent et se couchent en douceur au lieu de sauter.
        const BAR_SHAPE = [0.45, 0.8, 1, 0.7, 0.4];
        const BAR_SPEED = [3.1, 4.3, 2.6, 3.7, 4.9];
        const BAR_MIN_PX = 2;
        const BAR_MAX_PX = 14;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let amplitude = enabled ? 1 : 0;
        let barsRaf = null;
        let lastFrame = 0;

        const drawBars = (time) => {
            const seconds = time / 1000;
            bars.forEach((bar, index) => {
                const i = index % BAR_SHAPE.length;
                const wave = reduceMotion ? 0.75 : 0.55 + 0.45 * Math.sin(seconds * BAR_SPEED[i] + i * 1.7);
                const height = BAR_MIN_PX + (BAR_MAX_PX - BAR_MIN_PX) * BAR_SHAPE[i] * wave * amplitude;
                bar.style.height = `${height.toFixed(2)}px`;
            });
        };

        const animateBars = (time) => {
            const dt = lastFrame ? Math.min(time - lastFrame, 48) : 16;
            lastFrame = time;
            amplitude += ((enabled ? 1 : 0) - amplitude) * (1 - Math.exp(-dt / 140));
            drawBars(time);

            const settled = Math.abs((enabled ? 1 : 0) - amplitude) < 0.002;
            if (settled && (!enabled || reduceMotion)) {
                amplitude = enabled ? 1 : 0;
                drawBars(time);
                barsRaf = null;
                lastFrame = 0;
                return;
            }
            barsRaf = requestAnimationFrame(animateBars);
        };

        const startBars = () => {
            if (bars.length > 0 && barsRaf === null) barsRaf = requestAnimationFrame(animateBars);
        };

        const renderToggle = () => {
            soundButtons.forEach((button) => {
                button.classList.toggle('is-on', enabled);
                button.setAttribute('aria-pressed', String(enabled));
                button.setAttribute('aria-label', enabled ? 'Couper les sons' : 'Activer les sons');
            });
            startBars();
        };
        drawBars(performance.now());
        renderToggle();

        // Pas d'animation pendant que l'onglet est masqué.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (barsRaf !== null) cancelAnimationFrame(barsRaf);
                barsRaf = null;
                lastFrame = 0;
            } else {
                startBars();
            }
        });

        // Les boutons sont créés après le branchement du curseur dans
        // script-core.js : on leur applique le même état de survol.
        const customCursor = document.getElementById('custom-cursor');
        soundButtons.forEach((button) => {
            button.addEventListener('click', () => {
                enabled = !enabled;
                try {
                    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
                } catch {
                    // stockage indisponible : le choix vaut pour cette page seulement
                }
                renderToggle();
                unlock();
                if (enabled) window.setTimeout(() => play('soundOn'), 30);
            });
            if (customCursor) {
                button.addEventListener('pointerenter', () => customCursor.classList.add('hovered'));
                button.addEventListener('pointerleave', () => customCursor.classList.remove('hovered'));
            }
        });

        // ---------- Branchements ----------
        const menuButton = document.getElementById('menu-toggle');
        const menuWrapper = document.getElementById('menu-wrapper');
        const menuLinks = menuWrapper ? Array.from(menuWrapper.querySelectorAll('.menu-list a')) : [];
        const CLICKABLE = 'a, button, label[for]';

        // Clic global, sauf les éléments qui ont leur propre son.
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a, button');
            if (!target || target === menuButton || soundButtons.includes(target)) return;
            play('click');
        }, true);

        // Survol : uniquement les éléments cliquables, une fois à l'entrée.
        // Délégué au document pour couvrir aussi les éléments ajoutés plus tard.
        document.addEventListener('pointerover', (event) => {
            if (event.pointerType !== 'mouse') return;
            const target = event.target.closest(CLICKABLE);
            if (!target || target.contains(event.relatedTarget)) return;
            if (target === menuButton || menuLinks.includes(target)) return; // sons dédiés
            if (target.getAttribute('aria-disabled') === 'true' || target.disabled) return;
            play('hover');
        });

        // Menu : ouverture / fermeture d'après aria-expanded, quelle que soit la
        // façon de le fermer (burger, clic sur le fond, Echap).
        if (menuButton) {
            let wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
            new MutationObserver(() => {
                const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
                if (isOpen === wasOpen) return;
                wasOpen = isOpen;
                play('menu', isOpen);
            }).observe(menuButton, { attributes: true, attributeFilter: ['aria-expanded'] });
            onMouseEnter(menuButton, () => play('hover', 0.85));
        }

        // Brouillage des liens du menu : 4 liens x 120 ms de décalage + 650 ms.
        if (menuWrapper) {
            const scrambleMs = 650 + Math.max(menuLinks.length - 1, 0) * 120;
            let wasHidden = true;
            new MutationObserver(() => {
                const isHidden = menuWrapper.classList.contains('hidden-state') ||
                    menuWrapper.style.display === 'none';
                if (wasHidden && !isHidden) play('scramble', scrambleMs);
                wasHidden = isHidden;
            }).observe(menuWrapper, { attributes: true, attributeFilter: ['class', 'style'] });

            // Liens du menu : une note par lien, du grave vers l'aigu.
            menuLinks.forEach((link, i) => {
                onMouseEnter(link, () => play('hover', [1, 1.125, 1.25, 1.5][i % 4]));
            });
        }

        document.querySelectorAll('#theme-toggle, #theme-toggle-bottom').forEach((input) => {
            input.addEventListener('change', () => play('theme', input.checked));
        });

        // Typewriter (accueil, page « en cours ») : chaque mot qui apparaît.
        const typewriter = document.getElementById('typewriter');
        if (typewriter) {
            new MutationObserver((mutations) => {
                const shown = mutations.some((m) => m.target.classList?.contains('visible') &&
                    !(m.oldValue || '').includes('visible'));
                if (shown) play('word');
            }).observe(typewriter, {
                subtree: true,
                attributes: true,
                attributeFilter: ['class'],
                attributeOldValue: true,
            });
        }
    });
})();
