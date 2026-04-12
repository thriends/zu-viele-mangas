// Sticky nav elevation
const nav = document.querySelector('.nav');
const onScroll = () => {
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 20);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Scroll-reveal via IntersectionObserver
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Highlight active nav link based on current page
const path = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach((a) => {
  const href = a.getAttribute('href');
  if (href === path) a.classList.add('active');
});
