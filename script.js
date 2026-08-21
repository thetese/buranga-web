const menuButton = document.querySelector('.menu-button');
const mobilePanel = document.querySelector('.mobile-panel');
const mobileLinks = document.querySelectorAll('.mobile-panel a');

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  mobilePanel.setAttribute('aria-hidden', String(!open));
  mobilePanel.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
}

menuButton?.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});

mobileLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
