// Weekly chart (S T Q Q S S D) with y-axis 0..20
const chart = document.getElementById('chart');
[20, 15, 10, 5].forEach((v, i) => {
  const g = document.createElement('div');
  g.className = 'gl' + (i === 0 ? ' top' : '');
  g.style.top = `${i * 36}px`;
  g.innerHTML = `<span>${v}</span>`;
  chart.appendChild(g);
});
const zero = document.createElement('div');
zero.className = 'gl'; zero.style.top = '144px'; zero.innerHTML = '<span>0</span>';
chart.appendChild(zero);
const dots = document.createElement('div');
dots.className = 'dots';
dots.style.bottom = '36px';
dots.innerHTML = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(d => `<i><b>${d}</b></i>`).join('');
chart.appendChild(dots);

// Light/dark toggle (remembered when storage is available)
const root = document.documentElement;
const themeBtn = document.getElementById('themeBtn');
try { if (localStorage.getItem('theme') === 'light') root.classList.add('light'); } catch {}
themeBtn.addEventListener('click', () => {
  const light = root.classList.toggle('light');
  themeBtn.textContent = light ? '☾' : '☀';
  try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch {}
});

document.getElementById('updateBtn').addEventListener('click', e => {
  e.target.textContent = 'Atualizado ✓';
  setTimeout(() => (e.target.textContent = 'Atualizar'), 1500);
});
