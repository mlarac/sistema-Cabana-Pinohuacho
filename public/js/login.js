document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  if (!passwordInput || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    toggleBtn.setAttribute('aria-pressed', String(!showing));
    toggleBtn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye', showing);
      icon.classList.toggle('fa-eye-slash', !showing);
    }
  });
});
