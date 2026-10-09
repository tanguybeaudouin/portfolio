// ==========================================
// SOUND DESIGN — chargé sur toutes les pages
// ==========================================
// Tous les sons sont synthétisés en Web Audio : aucun fichier à charger. Une
// musique d'ambiance très discrète (quelques notes de piano espacées) joue
// tant que le son est actif.
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

                // L'ambiance suit l'état du contexte : elle démarre quand il
                // tourne, s'efface quand il est suspendu.
                ctx.addEventListener('statechange', syncAmbient);
            }
            // Créé pendant un geste, le contexte peut naître déjà actif, sans
            // déclencher statechange : on synchronise donc dans les deux cas.
            if (ctx.state === 'suspended') ctx.resume().then(syncAmbient, () => {});
            else syncAmbient();
        };
        // Un geste sur une page vaut pour la session : sur les pages suivantes,
        // on tente de relancer l'audio dès le chargement (voir en bas).
        const UNLOCKED_KEY = 'audio-unlocked';
        const onGesture = () => {
            unlock();
            try {
                sessionStorage.setItem(UNLOCKED_KEY, '1');
            } catch {
                // stockage indisponible : l'audio attendra un geste sur chaque page
            }
        };
        window.addEventListener('pointerdown', onGesture, true);
        window.addEventListener('keydown', onGesture, true);

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
        const WORD_FREQS = [523, 587, 659, 784]; // Do, Ré, Mi, Sol : jamais de note qui frotte
        const MENU_HOVER_FREQS = [840, 1080, 1180];
        let menuHoverIndex = 0;
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
            // Menu, d'après lusion.co : pas de souffle ni de nappe, un seul clic
            // très court (< 100 ms, éteint en 40 ms). Deux timbres comme leurs
            // click_0 / click_1 : l'ouverture, plus ronde (1,3 + 2,1 kHz, attaque
            // franche) ; la fermeture, une seule note plus claire (1,95 kHz) à
            // l'attaque un peu adoucie.
            menu(isOpen) {
                if (isOpen) {
                    tone({ freq: 1310, freqEnd: 1250, dur: 0.05, gain: 0.05, attack: 0.001 });
                    tone({ freq: 2120, dur: 0.032, gain: 0.03, attack: 0.001 });
                    noise({ freq: 5000, filter: 'highpass', dur: 0.012, gain: 0.03, attack: 0.001 });
                } else {
                    tone({ freq: 1950, freqEnd: 1880, dur: 0.055, gain: 0.05, attack: 0.008 });
                    noise({ freq: 6000, q: 1.2, dur: 0.016, gain: 0.022, attack: 0.004 });
                }
            },
            // Survol du burger et des liens du menu, d'après leurs hover_0..2 :
            // un « pouf » sourd vers 800-1200 Hz, 35 ms, deux fois plus discret
            // que le clic. Trois hauteurs jouées à tour de rôle, comme chez eux.
            menuHover() {
                const now = performance.now();
                if (now - lastHoverAt < 35) return;
                lastHoverAt = now;
                const freq = MENU_HOVER_FREQS[menuHoverIndex];
                menuHoverIndex = (menuHoverIndex + 1) % MENU_HOVER_FREQS.length;
                tone({ freq, freqEnd: freq * 0.85, dur: 0.035, gain: 0.03, attack: 0.004 });
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
            // Un son par mot, calé sur son apparition. Ce qui agaçait, c'était
            // le timbre (aigu + souffle) : ici une note grave, courte et douce,
            // sans souffle, à peine audible.
            word() {
                tone({ freq: pick(WORD_FREQS), dur: 0.04, gain: 0.008 * jitter(0.25), attack: 0.003 });
            },
            soundOn() {
                [660, 880, 1320].forEach((freq, i) => {
                    tone({ freq, dur: 0.12, gain: 0.04, delay: i * 0.07 });
                });
            },
        };

        // ---------- Ambiance ----------
        // Dans l'esprit des musiques de C418 pour Minecraft : pas de nappe, mais
        // quelques notes de piano feutré, lentes et espacées, noyées dans une
        // longue réverbération, puis de grands silences. Rien n'est écrit : chaque
        // phrase est tirée au hasard (2 à 5 notes, surtout par mouvements
        // conjoints) dans l'accord du moment, donc on ne réentend jamais la même.
        // Accords (notes MIDI) : Fa maj9, Do maj9, La m9, Sol 6/9. L'accord
        // dépend de l'heure, pour que la progression continue d'une page à l'autre.
        const CHORDS = [
            { bass: 41, tones: [57, 60, 64, 67, 69, 72, 76] },
            { bass: 36, tones: [55, 59, 60, 64, 67, 71, 74] },
            { bass: 45, tones: [57, 60, 64, 67, 69, 71, 72] },
            { bass: 43, tones: [55, 59, 62, 64, 67, 69, 74] },
        ];
        const CHORD_MS = 24000;
        const NOTE_GAPS = [0.6, 0.9, 1.2, 1.8]; // secondes entre deux notes d'une phrase
        const SILENCE_MIN = 4; // secondes de silence entre deux phrases
        const SILENCE_MAX = 11;
        const AMBIENT_LEVEL = 0.06; // volume de la musique : le réglage à toucher
        let ambientBus = null;
        let ambientInput = null;
        let ambientAnalyser = null;
        let ambientTimer = 0;
        let ambientOn = false;
        const ambientOscillators = new Set();

        const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);
        const pick = (list) => list[Math.floor(Math.random() * list.length)];

        const buildAmbient = () => {
            // Passe-bas : retire l'attaque métallique, garde le côté feutré.
            ambientInput = ctx.createBiquadFilter();
            ambientInput.type = 'lowpass';
            ambientInput.frequency.value = 2000;
            ambientInput.Q.value = 0.3;

            // Réverbération synthétique : 4,5 s de bruit qui s'éteint, un peu
            // différent à gauche et à droite pour l'espace.
            const reverb = ctx.createConvolver();
            const length = Math.floor(ctx.sampleRate * 4.5);
            const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
            for (let channel = 0; channel < 2; channel += 1) {
                const data = impulse.getChannelData(channel);
                for (let i = 0; i < length; i += 1) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
                }
            }
            reverb.buffer = impulse;

            const dry = ctx.createGain();
            const wet = ctx.createGain();
            dry.gain.value = 0.55;
            wet.gain.value = 0.5;

            ambientBus = ctx.createGain();
            ambientBus.gain.value = 0.0001;
            ambientInput.connect(dry);
            ambientInput.connect(reverb);
            reverb.connect(wet);
            dry.connect(ambientBus);
            wet.connect(ambientBus);

            // Écoute de la musique pour l'égaliseur du bouton, prise avant le
            // volume général : le bouton réagit pareil quel que soit AMBIENT_LEVEL.
            ambientAnalyser = ctx.createAnalyser();
            ambientAnalyser.fftSize = 2048;
            ambientAnalyser.smoothingTimeConstant = 0.85;
            dry.connect(ambientAnalyser);
            wet.connect(ambientAnalyser);
            ambientBus.connect(master);
        };

        // Piano feutré : une fondamentale qui tient, un 2e harmonique qui donne
        // le coup de marteau et s'éteint vite, un triangle pour la chaleur.
        // Les graves résonnent plus longtemps que les aigus.
        // `offset` (secondes) : note frappée sur la page précédente, qu'on fait
        // reprendre là où elle en était de sa résonance, sans nouvelle attaque.
        const noteDecay = (midi) => (midi < 50 ? 6 : 4.5 - (midi - 55) * 0.08);
        const pianoNote = (midi, time, velocity, offset = 0) => {
            const freq = midiToFreq(midi);
            const decay = noteDecay(midi);
            const partials = [
                { ratio: 1, type: 'sine', gain: 1, decay },
                { ratio: 2, type: 'sine', gain: 0.18, decay: 0.9 },
                { ratio: 1.0015, type: 'triangle', gain: 0.12, decay: decay * 0.7 },
            ];
            partials.forEach((partial) => {
                const remaining = partial.decay - offset;
                if (remaining < 0.2) return;
                const env = ctx.createGain();
                const peak = 0.22 * velocity * partial.gain;
                if (offset > 0) {
                    // Niveau atteint par l'enveloppe ci-dessous au bout de `offset`.
                    const level = offset < 0.35
                        ? peak * 0.4 ** ((offset - 0.015) / 0.335)
                        : peak * 0.4 * (0.0001 / (peak * 0.4)) ** ((offset - 0.35) / (partial.decay - 0.35));
                    env.gain.setValueAtTime(0, time);
                    env.gain.linearRampToValueAtTime(level, time + 0.08);
                    env.gain.exponentialRampToValueAtTime(0.0001, time + remaining);
                } else {
                    env.gain.setValueAtTime(0, time);
                    env.gain.linearRampToValueAtTime(peak, time + 0.015);
                    env.gain.exponentialRampToValueAtTime(peak * 0.4, time + 0.35);
                    env.gain.exponentialRampToValueAtTime(0.0001, time + partial.decay);
                }
                env.connect(ambientInput);

                const osc = ctx.createOscillator();
                osc.type = partial.type;
                osc.frequency.value = freq * partial.ratio;
                osc.connect(env);
                osc.start(time);
                osc.stop(time + remaining + 0.05);
                ambientOscillators.add(osc);
                osc.addEventListener('ended', () => ambientOscillators.delete(osc));
            });
        };

        // Mémoire des dernières notes (heure murale, en ms) et de la prochaine
        // phrase : passée à la page suivante pour que la musique y enchaîne.
        const AMBIENT_STATE_KEY = 'ambient-state';
        let recentNotes = [];
        let nextPhraseAt = 0;
        const playNote = (midi, time, velocity) => {
            pianoNote(midi, time, velocity);
            const at = Date.now() + (time - ctx.currentTime) * 1000;
            recentNotes.push({ midi, at, velocity });
        };

        // Une phrase : parfois une basse, puis quelques notes qui avancent par
        // petits pas dans l'accord, à des intervalles irréguliers. Renvoie sa
        // durée en secondes.
        const playPhrase = () => {
            const chord = CHORDS[Math.floor(Date.now() / CHORD_MS) % CHORDS.length];
            let time = ctx.currentTime + 0.05;
            const now = Date.now();
            recentNotes = recentNotes.filter((note) => now - note.at < noteDecay(note.midi) * 1000);
            if (Math.random() < 0.7) playNote(chord.bass, time, 0.55);

            const count = 2 + Math.floor(Math.random() * 4);
            let index = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i += 1) {
                time += pick(NOTE_GAPS) * (0.9 + Math.random() * 0.2);
                const velocity = 0.45 + Math.random() * 0.4;
                playNote(chord.tones[index], time, velocity);
                // De temps en temps, une tierce dessous : un accord à deux notes.
                if (index >= 2 && Math.random() < 0.2) {
                    playNote(chord.tones[index - 2], time + 0.02, velocity * 0.7);
                }
                // Au bord de l'accord, la mélodie rebondit au lieu de répéter la note.
                const step = pick([-2, -1, -1, 1, 1, 2]);
                const next = index + step;
                index = next < 0 || next >= chord.tones.length ? index - step : next;
            }
            return time - ctx.currentTime;
        };

        const scheduleNextPhrase = (delaySec) => {
            nextPhraseAt = Date.now() + delaySec * 1000;
            ambientTimer = window.setTimeout(() => {
                const phraseSec = playPhrase();
                const silence = SILENCE_MIN + Math.random() * (SILENCE_MAX - SILENCE_MIN);
                scheduleNextPhrase(phraseSec + silence);
            }, delaySec * 1000);
        };

        const startAmbient = () => {
            if (ambientOn) return;
            ambientOn = true;
            if (!ambientBus) buildAmbient();

            // Arrivée depuis une autre page du site : on reprend la musique où
            // elle en était (notes qui résonnaient encore, notes déjà prévues,
            // silence restant avant la phrase suivante).
            let saved = null;
            try {
                saved = JSON.parse(sessionStorage.getItem(AMBIENT_STATE_KEY));
                sessionStorage.removeItem(AMBIENT_STATE_KEY);
            } catch {
                // stockage indisponible : départ à zéro
            }
            const now = Date.now();
            const resuming = saved && now - saved.savedAt < 5000;

            ambientBus.gain.cancelScheduledValues(ctx.currentTime);
            ambientBus.gain.setTargetAtTime(AMBIENT_LEVEL, ctx.currentTime, resuming ? 0.03 : 0.5);

            if (resuming) {
                saved.notes.forEach(({ midi, at, velocity }) => {
                    const elapsed = (now - at) / 1000;
                    if (elapsed < 0) playNote(midi, ctx.currentTime - elapsed, velocity);
                    else pianoNote(midi, ctx.currentTime + 0.02, velocity, elapsed);
                });
                recentNotes = recentNotes.concat(saved.notes.filter((note) => note.at <= now));
                scheduleNextPhrase(Math.max((saved.nextAt - now) / 1000, 0.3));
            } else {
                // Première phrase quelques secondes après l'arrivée, jamais pile au clic.
                scheduleNextPhrase(3 + Math.random() * 4);
            }
        };

        window.addEventListener('pagehide', () => {
            if (!ambientOn) return;
            const now = Date.now();
            const notes = recentNotes.filter((note) => now - note.at < noteDecay(note.midi) * 1000);
            try {
                sessionStorage.setItem(AMBIENT_STATE_KEY, JSON.stringify({ savedAt: now, nextAt: nextPhraseAt, notes }));
            } catch {
                // stockage indisponible
            }
        });

        const stopAmbient = () => {
            if (!ambientOn) return;
            ambientOn = false;
            recentNotes = [];
            window.clearTimeout(ambientTimer);
            const now = ctx.currentTime;
            ambientBus.gain.cancelScheduledValues(now);
            ambientBus.gain.setTargetAtTime(0.0001, now, 0.4);
            // Les notes en cours ou programmées s'arrêtent une fois le fondu
            // fini, pour ne pas ressortir si le son est réactivé aussitôt.
            ambientOscillators.forEach((osc) => {
                try {
                    osc.stop(now + 2);
                } catch {
                    // déjà arrêté
                }
            });
        };

        function syncAmbient() {
            if (!ctx) return;
            if (enabled && ctx.state === 'running' && !document.hidden) startAmbient();
            else stopAmbient();
        }

        // Onglet masqué : la nappe s'efface puis le contexte se met en pause.
        document.addEventListener('visibilitychange', () => {
            if (!ctx) return;
            if (document.hidden) {
                stopAmbient();
                window.setTimeout(() => {
                    if (document.hidden && ctx.state === 'running') ctx.suspend();
                }, 2000);
            } else if (ctx.state === 'suspended') {
                ctx.resume().then(syncAmbient, () => {});
            } else {
                syncAmbient();
            }
        });

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

        // Égaliseur : chaque trait oscille à sa propre vitesse autour d'un
        // profil d'onde ; l'amplitude glisse vers 1 (son actif) ou vers 0
        // (coupé) pour que les traits se dressent et se couchent en douceur
        // jusqu'aux points de l'état coupé.
        const BAR_SHAPE = [0.35, 1, 0.55, 0.8, 0.35];
        const BAR_SPEED = [3.1, 4.3, 2.6, 3.7, 4.9];
        const BAR_MIN_PX = 2;
        const BAR_MAX_PX = 12;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let amplitude = enabled ? 1 : 0;
        let barsRaf = null;
        let lastFrame = 0;

        // Chaque trait écoute une bande de la musique, du grave (à gauche) vers
        // l'aigu. Au repos, ils respirent à mi-hauteur ; une note les pousse
        // vers le haut, puis ils redescendent avec la réverbération.
        // Bandes calées sur la tessiture du piano (basse ~90 Hz, mélodie
        // 196-660 Hz) ; le dernier trait suit les harmoniques, plus faibles,
        // d'où son bonus en dB.
        const BAR_BANDS = [[80, 180], [180, 300], [300, 450], [450, 700], [700, 1400]];
        const BAND_BOOST_DB = [6, 0, 0, 0, 12];
        const BAND_FLOOR_DB = -72; // en dessous : silence
        const BAND_CEIL_DB = -34; // au-dessus : trait au maximum
        const IDLE_SHARE = 0.5; // part de la hauteur laissée à la respiration
        const energies = BAR_BANDS.map(() => 0);
        let spectrum = null;

        const readEnergies = () => {
            if (!ambientAnalyser || !ambientOn) {
                energies.fill(0);
                return;
            }
            if (!spectrum) spectrum = new Float32Array(ambientAnalyser.frequencyBinCount);
            ambientAnalyser.getFloatFrequencyData(spectrum);
            const hzPerBin = ctx.sampleRate / ambientAnalyser.fftSize;
            BAR_BANDS.forEach(([low, high], i) => {
                let peak = -Infinity;
                for (let bin = Math.floor(low / hzPerBin); bin <= Math.ceil(high / hzPerBin); bin += 1) {
                    peak = Math.max(peak, spectrum[bin]);
                }
                const level = (peak + BAND_BOOST_DB[i] - BAND_FLOOR_DB) / (BAND_CEIL_DB - BAND_FLOOR_DB);
                energies[i] = Math.min(Math.max(level, 0), 1);
            });
        };

        const drawBars = (time) => {
            const seconds = time / 1000;
            readEnergies();
            bars.forEach((bar, index) => {
                const i = index % BAR_SHAPE.length;
                const wave = reduceMotion ? 0.8 : 0.6 + 0.4 * Math.sin(seconds * BAR_SPEED[i] + i * 1.7);
                const idle = BAR_SHAPE[i] * wave * IDLE_SHARE;
                const level = idle + (1 - idle) * energies[i];
                const height = BAR_MIN_PX + (BAR_MAX_PX - BAR_MIN_PX) * level * amplitude;
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
                syncAmbient();
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
            onMouseEnter(menuButton, () => play('menuHover'));
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
        }

        menuLinks.forEach((link) => onMouseEnter(link, () => play('menuHover')));

        document.querySelectorAll('#theme-toggle').forEach((input) => {
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

        // Pages suivantes de la session : on relance l'audio sans attendre de
        // clic, pour que l'ambiance enchaîne. Si le navigateur refuse (Safari),
        // le contexte reste suspendu et le premier geste le débloquera.
        let wasUnlocked = false;
        try {
            wasUnlocked = sessionStorage.getItem(UNLOCKED_KEY) === '1';
        } catch {
            // stockage indisponible
        }
        if (enabled && wasUnlocked) unlock();
    });
})();
