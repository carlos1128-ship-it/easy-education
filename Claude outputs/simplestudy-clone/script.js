const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Modal: opens automatically after a short delay, and from every CTA
const modal = $('#modal');
const openModal = () => { modal.hidden = false; };
const closeModal = () => { modal.hidden = true; try { sessionStorage.setItem('modalClosed', '1'); } catch {} };
$$('.modal-body .btn-primary, .modal-body small a').forEach(el => el.setAttribute('href', 'dashboard.html'));
$$('[data-open-modal]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openModal(); }));
$('#closeModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
let seen = false; try { seen = sessionStorage.getItem('modalClosed') === '1'; } catch {}
if (!seen) setTimeout(openModal, 1200);

// Dropdowns
$$('.dd-btn').forEach(btn => btn.addEventListener('click', e => {
  e.stopPropagation();
  const dd = btn.closest('.dropdown');
  const wasOpen = dd.classList.contains('open');
  $$('.dropdown.open').forEach(d => d.classList.remove('open'));
  dd.classList.toggle('open', !wasOpen);
  btn.setAttribute('aria-expanded', String(!wasOpen));
}));
document.addEventListener('click', () => $$('.dropdown.open').forEach(d => d.classList.remove('open')));

// Mobile burger
$('#burger').addEventListener('click', () => $('#navLinks').classList.toggle('open'));

// Exam chips
$$('.chip').forEach(c => c.addEventListener('click', () => {
  $$('.chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on');
}));

// Quiz demo
$$('.quiz button').forEach(b => b.addEventListener('click', () => {
  $$('.quiz button').forEach(x => x.classList.remove('bad', 'ok'));
  if (b.textContent.trim() === 'Lungs') b.classList.add('ok');
  else { b.classList.add('bad'); $$('.quiz button').find(x => x.textContent.trim() === 'Lungs').classList.add('ok'); }
}));

// Subject SEO links
const subjects = ['Chemistry', 'Economics', 'Mathematics', 'Biology', 'Geography', 'Physics', 'Business', 'History'];
const kinds = ['Revision Notes', 'Model Answers', 'Past Papers', 'Quizzes', 'Flashcards'];
$('#seoGrid').innerHTML = subjects.map(s =>
  `<div><h5>${s}</h5>${kinds.map(k => `<a href="#">${s} ${k}</a>`).join('')}</div>`).join('');

// Search: filters subject tiles live
$('#searchInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  $$('.subj').forEach(s => { s.style.display = !q || s.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  if (q) $('.subjects').scrollIntoView({ behavior: 'smooth' });
});
