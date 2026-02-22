document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // GESTION DES PROJETS
    // ==========================================
    const projectItems = document.querySelectorAll('.project-item');
    const hoverInfo = document.querySelector('.projects-hover-info');
    const hoverTitle = document.querySelector('.projects-hover-title');
    const hoverTags = document.querySelector('.projects-hover-tags');
    const hoverDesc = document.querySelector('.projects-hover-desc');

    const updateHoverInfo = (item) => {
        if (!hoverInfo || !item) return;
        if (hoverTitle) hoverTitle.textContent = item.getAttribute('data-title') || 'Projet';
        if (hoverTags) hoverTags.textContent = item.getAttribute('data-tags') || '';
        if (hoverDesc) hoverDesc.textContent = item.getAttribute('data-description') || '';
        hoverInfo.classList.add('is-active');
    };

    const resetHoverInfo = () => {
        if (!hoverInfo) return;
        hoverInfo.classList.remove('is-active');
    };

    projectItems.forEach(item => {
        item.addEventListener('mouseenter', () => updateHoverInfo(item));
        item.addEventListener('mouseleave', resetHoverInfo);
        item.addEventListener('focus', () => updateHoverInfo(item));
        item.addEventListener('blur', resetHoverInfo);
    });
});
