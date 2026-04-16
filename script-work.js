document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // GESTION DES PROJETS
    // ==========================================
    const projectItems = document.querySelectorAll('.project-item');
    const hoverInfo = document.querySelector('.projects-hover-float');
    const baseline = document.querySelector('.about-baseline-section');
    const hoverTitle = document.querySelector('.projects-hover-title');
    const hoverDesc = document.querySelector('.projects-hover-desc');
    const canUsePointerMotion =
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeItem = null;
    let hoverMotionTargetX = 0;
    let hoverMotionTargetY = 0;
    let hoverMotionCurrentX = 0;
    let hoverMotionCurrentY = 0;
    let hoverTiltTargetX = 0;
    let hoverTiltTargetY = 0;
    let hoverTiltCurrentX = 0;
    let hoverTiltCurrentY = 0;
    let hoverMotionFrameId = null;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (from, to, alpha) => from + (to - from) * alpha;

    // Sécurise le lien de la card Frame by Frame, même si une ancienne version HTML est en cache.
    const frameByFrameItem = document.querySelector('.project-item-fbf') ||
        Array.from(projectItems).find(item => (item.getAttribute('data-title') || '').toLowerCase().includes('frame by frame'));
    if (frameByFrameItem) {
        frameByFrameItem.setAttribute('href', 'project-2.html');
    }

    const animateHoverInfoMotion = () => {
        if (!hoverInfo) {
            hoverMotionFrameId = null;
            return;
        }

        hoverMotionCurrentX = lerp(hoverMotionCurrentX, hoverMotionTargetX, 0.1);
        hoverMotionCurrentY = lerp(hoverMotionCurrentY, hoverMotionTargetY, 0.1);
        hoverTiltCurrentX = lerp(hoverTiltCurrentX, hoverTiltTargetX, 0.12);
        hoverTiltCurrentY = lerp(hoverTiltCurrentY, hoverTiltTargetY, 0.12);

        hoverInfo.style.setProperty('--hover-motion-x', `${hoverMotionCurrentX}px`);
        hoverInfo.style.setProperty('--hover-motion-y', `${hoverMotionCurrentY}px`);
        hoverInfo.style.setProperty('--hover-tilt-x', `${hoverTiltCurrentX}deg`);
        hoverInfo.style.setProperty('--hover-tilt-y', `${hoverTiltCurrentY}deg`);

        const deltaX = Math.abs(hoverMotionTargetX - hoverMotionCurrentX);
        const deltaY = Math.abs(hoverMotionTargetY - hoverMotionCurrentY);
        const deltaTiltX = Math.abs(hoverTiltTargetX - hoverTiltCurrentX);
        const deltaTiltY = Math.abs(hoverTiltTargetY - hoverTiltCurrentY);
        if (deltaX < 0.05 && deltaY < 0.05 && deltaTiltX < 0.02 && deltaTiltY < 0.02) {
            hoverMotionCurrentX = hoverMotionTargetX;
            hoverMotionCurrentY = hoverMotionTargetY;
            hoverTiltCurrentX = hoverTiltTargetX;
            hoverTiltCurrentY = hoverTiltTargetY;
            hoverInfo.style.setProperty('--hover-motion-x', `${hoverMotionCurrentX}px`);
            hoverInfo.style.setProperty('--hover-motion-y', `${hoverMotionCurrentY}px`);
            hoverInfo.style.setProperty('--hover-tilt-x', `${hoverTiltCurrentX}deg`);
            hoverInfo.style.setProperty('--hover-tilt-y', `${hoverTiltCurrentY}deg`);
            hoverMotionFrameId = null;
            return;
        }

        hoverMotionFrameId = requestAnimationFrame(animateHoverInfoMotion);
    };

    const ensureHoverInfoMotionLoop = () => {
        if (hoverMotionFrameId !== null) return;
        hoverMotionFrameId = requestAnimationFrame(animateHoverInfoMotion);
    };

    const updatePointerMotion = (item, event) => {
        if (!canUsePointerMotion || !item || !event) return;
        const rect = item.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

        item.style.setProperty('--pointer-x', String(clamp(x, -1, 1)));
        item.style.setProperty('--pointer-y', String(clamp(y, -1, 1)));

        if (hoverInfo && activeItem === item) {
            hoverMotionTargetX = x * 16;
            hoverMotionTargetY = y * 16;
            hoverTiltTargetX = x * 6;
            hoverTiltTargetY = y * -6;
            ensureHoverInfoMotionLoop();
        }
    };

    const resetPointerMotion = (item) => {
        if (!item) return;
        item.style.setProperty('--pointer-x', '0');
        item.style.setProperty('--pointer-y', '0');
        if (hoverInfo && activeItem === item) {
            hoverMotionTargetX = 0;
            hoverMotionTargetY = 0;
            hoverTiltTargetX = 0;
            hoverTiltTargetY = 0;
            ensureHoverInfoMotionLoop();
        }
    };

    const updateHoverInfo = (item) => {
        if (!hoverInfo || !item || !baseline) return;
        if (hoverTitle) hoverTitle.textContent = item.getAttribute('data-title') || 'Projet';
        if (hoverDesc) hoverDesc.textContent = item.getAttribute('data-description') || '';

        const baselineRect = baseline.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        hoverInfo.style.setProperty('--hover-width', `${itemRect.width}px`);
        hoverInfo.classList.add('is-active');

        const hoverRect = hoverInfo.getBoundingClientRect();
        const preferredTop = itemRect.top - baselineRect.top - hoverRect.height - 32;
        const preferredLeft = itemRect.left - baselineRect.left;
        const maxLeft = Math.max(0, baselineRect.width - hoverRect.width);

        hoverInfo.style.top = `${Math.max(0, preferredTop)}px`;
        hoverInfo.style.left = `${Math.max(0, Math.min(preferredLeft, maxLeft))}px`;
    };

    const resetHoverInfo = () => {
        if (!hoverInfo) return;
        hoverInfo.classList.remove('is-active');
    };

    const playHoverVideo = (item) => {
        const video = item?.querySelector('.project-video');
        item?.classList.add('is-hover-active');
        if (!video) return;

        video.currentTime = 0;

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
    };

    const stopHoverVideo = (item) => {
        const video = item?.querySelector('.project-video');
        item?.classList.remove('is-hover-active');
        if (!video) return;

        video.pause();
        video.currentTime = 0;
    };

    projectItems.forEach(item => {
        item.addEventListener('mouseenter', event => {
            activeItem = item;
            updateHoverInfo(item);
            playHoverVideo(item);
            updatePointerMotion(item, event);
        });
        item.addEventListener('mouseleave', () => {
            resetHoverInfo();
            stopHoverVideo(item);
            resetPointerMotion(item);
            activeItem = null;
        });
        item.addEventListener('focus', () => {
            activeItem = item;
            updateHoverInfo(item);
            playHoverVideo(item);
        });
        item.addEventListener('blur', () => {
            resetHoverInfo();
            stopHoverVideo(item);
            resetPointerMotion(item);
            activeItem = null;
        });
        item.addEventListener('mousemove', event => updatePointerMotion(item, event));
    });
});
