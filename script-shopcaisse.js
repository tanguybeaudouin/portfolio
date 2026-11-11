// ==========================================
// SHOPCAISSE : mega-menu interactif (shopcaisse.html)
// ==========================================
// Les onglets de la maquette codee ouvrent le panneau correspondant, au
// survol ou au clic. Tant que le visiteur n'y touche pas, la maquette fait
// defiler les panneaux toute seule quand elle est a l'ecran. Sans JS, le
// panneau « L'appli » reste ouvert.
document.addEventListener('DOMContentLoaded', () => {
    initMegaMenu();
    initPricing();
    initCompareTable();
    initMobileMenu();
});

function initMegaMenu() {
    const demo = document.querySelector('.sc-demo');
    if (!demo) return;

    const tabs = Array.from(demo.querySelectorAll('[data-sc-tab]'));
    const panels = Array.from(demo.querySelectorAll('[data-sc-panel]'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const open = (id) => {
        demo.classList.toggle('is-open', Boolean(id));
        tabs.forEach((tab) => {
            const isActive = Boolean(id) && tab.dataset.scTab === id;
            tab.classList.toggle('is-active', isActive);
            if (tab.dataset.scTab) tab.setAttribute('aria-expanded', String(isActive));
        });
        panels.forEach((panel) => {
            panel.hidden = panel.dataset.scPanel !== id;
        });
    };

    // Defilement automatique : chaque panneau a son tour (le hero ferme est
    // deja montre plus haut dans la page).
    const cycle = ['appli', 'fonctionnalites', 'activite', 'ressources'];
    let step = 0;
    let timer = null;
    let userTookOver = false;

    const stop = () => {
        clearInterval(timer);
        timer = null;
    };

    const start = () => {
        if (timer || userTookOver || prefersReducedMotion) return;
        timer = setInterval(() => {
            step = (step + 1) % cycle.length;
            open(cycle[step]);
        }, 3200);
    };

    const takeOver = () => {
        userTookOver = true;
        stop();
    };

    tabs.forEach((tab) => {
        const show = () => {
            takeOver();
            // Tarifs et Clients n'ont pas de panneau : le dernier reste ouvert.
            if (tab.dataset.scTab) open(tab.dataset.scTab);
        };
        tab.addEventListener('mouseenter', show);
        tab.addEventListener('focus', show);
        tab.addEventListener('click', show);
    });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
        }, { threshold: 0.5 }).observe(demo);
    }
}

// ==========================================
// SHOPCAISSE : selecteur Mensuel / Annuel de la grille tarifaire
// ==========================================
// Chaque prix porte ses deux valeurs (data-monthly / data-yearly) ; le
// selecteur bascule de l'une a l'autre avec un court fondu.
function initPricing() {
    const pricing = document.querySelector('.sc-prices');
    if (!pricing) return;

    const options = Array.from(pricing.querySelectorAll('[data-period]'));
    const amounts = Array.from(pricing.querySelectorAll('.sc-amount'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setPeriod = (period) => {
        options.forEach((option) => {
            const isActive = option.dataset.period === period;
            option.classList.toggle('is-active', isActive);
            option.setAttribute('aria-pressed', String(isActive));
        });
        amounts.forEach((amount) => {
            const value = amount.dataset[period];
            if (amount.textContent === value) return;
            if (prefersReducedMotion) {
                amount.textContent = value;
                return;
            }
            amount.classList.add('is-switching');
            setTimeout(() => {
                amount.textContent = value;
                amount.classList.remove('is-switching');
            }, 200);
        });
    };

    options.forEach((option) => {
        option.addEventListener('click', () => setPeriod(option.dataset.period));
    });
}

// ==========================================
// SHOPCAISSE : tableau comparatif, colonne surlignee au survol
// ==========================================
// La colonne Pro est surlignee par defaut (data-default-col) ; survoler une
// autre colonne deplace la surbrillance, quitter le tableau la ramene.
function initCompareTable() {
    const table = document.querySelector('.sc-table');
    if (!table) return;

    const cells = Array.from(table.querySelectorAll('[data-col]'));
    const highlight = (col) => {
        cells.forEach((cell) => cell.classList.toggle('is-col', cell.dataset.col === col));
    };

    cells.forEach((cell) => {
        cell.addEventListener('mouseenter', () => {
            table.classList.add('is-hovering');
            highlight(cell.dataset.col);
        });
    });

    table.addEventListener('mouseleave', () => {
        table.classList.remove('is-hovering');
        highlight(table.dataset.defaultCol);
    });
}

// ==========================================
// SHOPCAISSE : menu mobile interactif
// ==========================================
// Toute la barre est navigable : chaque entree ouvre son niveau (jusqu'aux
// metiers de chaque secteur), « Retour » remonte, la croix referme et le
// burger rouvre. Le cadre prend la hauteur du niveau affiche, pour ne pas
// laisser de vide sous le menu.
function initMobileMenu() {
    const demo = document.querySelector('.sc-mdemo');
    if (!demo) return;

    const STAGE_WIDTH = 358;
    const BOTTOM_SPACE = 24;
    const levels = new Map(
        Array.from(demo.querySelectorAll('[data-sc-level]')).map((el) => [el.dataset.scLevel, el])
    );
    // Profondeur de chaque niveau, pour le sens du glissement.
    const depth = (key) => {
        if (key === 'closed') return 0;
        if (key === 'menu') return 1;
        if (['appli', 'fonctionnalites', 'activite', 'ressources'].includes(key)) return 2;
        return 3;
    };
    let current = 'menu';

    const fitHeight = () => {
        const level = levels.get(current);
        if (!level) return;
        // Meme plafond que le CSS : le menu ne depasse pas sa taille reelle.
        const scale = Math.min(demo.clientWidth / STAGE_WIDTH, 1);
        demo.style.aspectRatio = 'auto';
        demo.style.height = `${Math.ceil((level.offsetHeight + BOTTOM_SPACE) * scale)}px`;
    };

    const go = (key) => {
        if (key === current || !levels.has(key)) return;
        demo.classList.toggle('is-opening', current === 'closed');
        demo.classList.toggle('is-back', depth(key) < depth(current) && key !== 'closed');
        current = key;
        levels.forEach((el, k) => {
            el.hidden = k !== key;
        });
        fitHeight();
    };

    demo.querySelectorAll('[data-sc-go]').forEach((control) => {
        control.addEventListener('click', () => go(control.dataset.scGo));
    });

    fitHeight();
    window.addEventListener('resize', fitHeight);
    // Les polices changent la hauteur des niveaux une fois chargees.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeight);
}
