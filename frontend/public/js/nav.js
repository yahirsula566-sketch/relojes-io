import { toggleTheme } from './theme.js';
import { cart } from './cart.js';

function updateCartCount() {
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    const count = cart.count();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

export function initNav() {
  updateCartCount();
  document.addEventListener('cart:changed', updateCartCount);

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', toggleTheme);
  });
  document.querySelectorAll('[data-theme-icon]').forEach((el) => {
    el.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  });

  const mobileToggle = document.querySelector('[data-mobile-nav-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
  }

  document.querySelectorAll('[data-search-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = form.querySelector('input').value.trim();
      window.location.href = `/catalogo.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    });
  });
}

document.addEventListener('DOMContentLoaded', initNav);
