window.addEventListener('load', () => {
    // ==========================================
    // FORMULAIRE CONTACT (CTA ENVOYER)
    // ==========================================
    const contactForm = document.querySelector('#contact-form');
    const contactSubmit = document.querySelector('.contact-submit');
    const contactFeedback = document.querySelector('.contact-feedback');
    const contactHint = document.querySelector('.contact-hint');

    function setContactSubmitState(isEnabled) {
        if (!contactSubmit) return;
        contactSubmit.disabled = !isEnabled;
        contactSubmit.setAttribute('aria-disabled', String(!isEnabled));
        contactSubmit.classList.toggle('is-enabled', isEnabled);
    }

    const email = contactForm?.querySelector('#email');
    const subject = contactForm?.querySelector('#subject');
    const message = contactForm?.querySelector('#message');

    function validateContactForm() {
        if (!contactForm || !email || !subject || !message) return;
        const isValid =
            email.value.trim() !== '' &&
            subject.value.trim() !== '' &&
            message.value.trim() !== '' &&
            email.checkValidity();

        email.setAttribute('aria-invalid', String(!email.checkValidity() || email.value.trim() === ''));
        subject.setAttribute('aria-invalid', String(subject.value.trim() === ''));
        message.setAttribute('aria-invalid', String(message.value.trim() === ''));

        setContactSubmitState(isValid);
        if (contactHint) {
            contactHint.classList.toggle('is-hidden', isValid);
        }
        return isValid;
    }

    if (contactForm) {
        setContactSubmitState(false);
        contactForm.addEventListener('input', () => validateContactForm());
        contactForm.addEventListener('change', () => validateContactForm());
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const isValid = validateContactForm();
            if (!isValid || contactSubmit?.disabled) return;

            const formData = new FormData(contactForm);
            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    contactForm.reset();
                    setContactSubmitState(false);
                    [email, subject, message].forEach(field => {
                        if (!field) return;
                        field.setAttribute('aria-invalid', 'false');
                    });
                    if (contactHint) {
                        contactHint.classList.remove('is-hidden');
                    }
                    if (contactFeedback) {
                        contactFeedback.textContent = "Merci pour votre message, j’y répondrai au plus vite.";
                    }
                } else {
                    if (contactFeedback) {
                        contactFeedback.textContent = "Oups, une erreur est survenue. Réessayez dans un instant.";
                    }
                }
            } catch (error) {
                if (contactFeedback) {
                    contactFeedback.textContent = "Oups, une erreur est survenue. Réessayez dans un instant.";
                }
            }
        });
    }

    const copyEmailButton = document.querySelector('.copy-email');
    if (copyEmailButton) {
        copyEmailButton.addEventListener('click', async () => {
            const emailText = copyEmailButton.querySelector('.contact-email-text')?.textContent?.trim();
            if (!emailText) return;
            try {
                await navigator.clipboard.writeText(emailText);
            } catch (err) {
                const textarea = document.createElement('textarea');
                textarea.value = emailText;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        });
    }
});
