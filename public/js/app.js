document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    });
  });

  const password = document.querySelector('#password');
  const confirmation = document.querySelector('#confirmPassword');
  if (password && confirmation) {
    const validatePassword = () => {
      confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value ? 'Passwords do not match.' : '');
    };
    password.addEventListener('input', validatePassword);
    confirmation.addEventListener('input', validatePassword);
  }

  document.querySelectorAll('textarea[maxlength]').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      textarea.setAttribute('aria-valuemax', textarea.maxLength);
    });
  });
});
