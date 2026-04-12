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

// Live-Loader: holt die neuesten Folgen aus der iTunes-Lookup-API
const APPLE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-1.7 19.85v-3.8a3 3 0 113.4 0v3.8A10 10 0 0012 2zm0 6a3.5 3.5 0 110 7 3.5 3.5 0 010-7z"/></svg>';
const SPOTIFY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.7.7 0 01-.96.24c-2.64-1.61-5.97-1.97-9.89-1.08a.7.7 0 11-.31-1.36c4.29-.97 7.96-.55 10.92 1.24.33.2.43.65.24.96zm1.23-2.74a.87.87 0 01-1.2.29c-3.02-1.86-7.63-2.4-11.2-1.31a.87.87 0 11-.51-1.66c4.08-1.25 9.16-.64 12.63 1.49.41.26.54.8.28 1.2zm.1-2.85C14.35 8.74 7.98 8.55 4.56 9.6a1.05 1.05 0 11-.6-2c3.93-1.2 10.96-.97 15.28 1.58a1.05 1.05 0 01-1.07 1.81z"/></svg>';
const YOUTUBE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>';
const SPOTIFY_SHOW_URL = 'https://open.spotify.com/show/5D5eCTuyQ6V66Uarn6dgdk';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@zu_viele_mangas';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const cleanTitle = (t) => String(t ?? '')
  .replace(/\s*[(\[]\s*#?folge\s*\d+\s*[)\]]\s*$/i, '')
  .replace(/^\s*\d+\.\s*folge[:?]?\s*/i, '')
  .replace(/\s*#\d+\s*$/, '')
  .trim();

const extractFolgeNr = (title) => {
  const s = String(title ?? '');
  let m = s.match(/[(\[]\s*#?folge\s*(\d+)\s*[)\]]/i);
  if (m) return m[1];
  m = s.match(/(\d+)\.\s*folge/i);
  if (m) return m[1];
  m = s.match(/#(\d+)\s*$/);
  if (m) return m[1];
  return null;
};

async function loadEpisodes() {
  const list = document.getElementById('episode-list');
  if (!list) return;

  try {
    const res = await fetch('episodes.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const eps = (data.episodes || [])
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, 5);

    if (!eps.length) throw new Error('empty');

    list.innerHTML = eps.map((ep) => {
      const rawNum = ep.episodeNumber ?? extractFolgeNr(ep.trackName);
      const num = rawNum ? String(rawNum).padStart(2, '0') : '–';
      const date = new Date(ep.releaseDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
      const mins = Math.round((ep.trackTimeMillis || 0) / 60000);
      const title = esc(cleanTitle(ep.trackName));
      const appleUrl = esc((ep.trackViewUrl || '').replace('/us/', '/de/'));

      return `
        <article class="episode">
          <div class="episode-num"><small>Folge</small>${esc(num)}</div>
          <div class="episode-meta">
            <h3>${title}</h3>
            <div class="info">
              <span>${esc(date)}</span>
              <span>ca. ${mins} Min.</span>
            </div>
          </div>
          <div class="episode-links">
            <a class="episode-link" href="${appleUrl}" target="_blank" rel="noopener" aria-label="Folge auf Apple Podcasts öffnen" title="Auf Apple Podcasts">${APPLE_ICON}</a>
            <a class="episode-link" href="${SPOTIFY_SHOW_URL}" target="_blank" rel="noopener" aria-label="Auf Spotify öffnen" title="Auf Spotify">${SPOTIFY_ICON}</a>
            <a class="episode-link" href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener" aria-label="Auf YouTube öffnen" title="Auf YouTube">${YOUTUBE_ICON}</a>
          </div>
        </article>
      `;
    }).join('');
  } catch {
    list.innerHTML = `
      <p class="episode-error">
        Folgen gerade nicht verfügbar. Hör direkt auf
        <a href="https://podcasts.apple.com/de/podcast/zu-viele-mangas/id1849594551" target="_blank" rel="noopener">Apple Podcasts</a> oder
        <a href="https://open.spotify.com/show/5D5eCTuyQ6V66Uarn6dgdk" target="_blank" rel="noopener">Spotify</a>.
      </p>`;
  }
}

loadEpisodes();
