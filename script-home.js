(() => {
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.body.classList.contains('home-page')) return;

        const baselineSection = document.querySelector('.baseline-section');
        const baselineWrapper = document.getElementById('baseline-wrapper');
        const typewriter = document.getElementById('typewriter');
        if (!baselineSection || !baselineWrapper || !typewriter) return;

        const canUseParallax =
            window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!canUseParallax) return;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const lerp = (from, to, alpha) => from + (to - from) * alpha;

        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let rafId = null;

        const render = () => {
            currentX = lerp(currentX, targetX, 0.16);
            currentY = lerp(currentY, targetY, 0.16);

            baselineWrapper.style.setProperty('--home-parallax-x', `${currentX}px`);
            baselineWrapper.style.setProperty('--home-parallax-y', `${currentY}px`);

            const done = Math.abs(currentX - targetX) < 0.05 && Math.abs(currentY - targetY) < 0.05;
            if (done) {
                rafId = null;
                return;
            }

            rafId = window.requestAnimationFrame(render);
        };

        const startRender = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(render);
        };

        const updateFromPointer = (event) => {
            const rect = baselineSection.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

            targetX = clamp(x, -1, 1) * 14;
            targetY = clamp(y, -1, 1) * 9;
            startRender();
        };

        const resetParallax = () => {
            targetX = 0;
            targetY = 0;
            startRender();
        };

        baselineSection.addEventListener('pointerenter', updateFromPointer);
        baselineSection.addEventListener('pointermove', updateFromPointer);
        baselineSection.addEventListener('pointerleave', resetParallax);
        window.addEventListener('blur', resetParallax);
    });
})();
