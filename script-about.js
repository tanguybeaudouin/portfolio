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
