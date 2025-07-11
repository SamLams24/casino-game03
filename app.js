// ————————————————————————————————
// 1) Mersenne Twister (PRNG)
// ————————————————————————————————
function MersenneTwister(seed) {
  this.mt = new Array(624);
  this.index = 0;
  this.mt[0] = seed >>> 0;
  for (let i = 1; i < 624; i++) {
    this.mt[i] = (0x6c078965 * (this.mt[i-1] ^ (this.mt[i-1] >>> 30)) + i) >>> 0;
  }
}
MersenneTwister.prototype.extractNumber = function() {
  if (this.index === 0) this.generateNumbers();
  let y = this.mt[this.index];
  y ^= y >>> 11;
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= y >>> 18;
  this.index = (this.index + 1) % 624;
  return y / 0xFFFFFFFF;
};
MersenneTwister.prototype.generateNumbers = function() {
  for (let i = 0; i < 624; i++) {
    let y = (this.mt[i] & 0x80000000) + (this.mt[(i+1)%624] & 0x7fffffff);
    this.mt[i] = this.mt[(i+397)%624] ^ (y >>> 1);
    if (y % 2 !== 0) this.mt[i] ^= 0x9908b0df;
  }
};

// ————————————————————————————————
// 2) Init jeu & warm‑up du PRNG
// ————————————————————————————————
const rng = new MersenneTwister(Date.now());
for (let i = 0; i < 200; i++) rng.extractNumber();

const spinBtn   = document.getElementById("spin");
const resultat  = document.getElementById("resultat");
const balanceEl = document.getElementById("balance");
const tickSound = document.getElementById("tickSound");
const winSound  = document.getElementById("winSound");
const insigns   = document.querySelectorAll(".insign");

let balance       = 0;
let current       = 0;
const totalInsigns = insigns.length;
const speed        = 100;
let interval;

const defaultTitle = document.title;
let titleInterval;

// ————————————————————————————————
// 3) Slots & probas mode démoniaque
// ————————————————————————————————
const slots = [
  { sym: '🍒', gain:  200,  prob: 0.000004  },
  { sym: '💎', gain:  300,  prob: 0.000002  },
  { sym: '🔔', gain:    0,  prob: 0.7        },
  { sym: '🍋', gain:  100,  prob: 0.000006  },
  { sym: '⭐', gain:  500,  prob: 0.0000005 },
  { sym: '💰', gain: 1000,  prob: 0.0000001 },
  { sym: '☘️', gain:    0,  prob: 0.29998935 },
  { sym: '👑', gain: 2000,  prob: 0.00000005 }
];

// Vérifie la somme des probas
const totalProb = slots.reduce((acc, s) => acc + s.prob, 0);
console.log("Total probabilité =", totalProb.toFixed(10));

// ————————————————————————————————
// 4) Tirage pondéré sécurisé
// ————————————————————————————————
function pick(rng) {
  const r = rng.extractNumber();
  let sum = 0;
  for (const s of slots) {
    sum += s.prob;
    if (r <= sum) return s;
  }
  // Si aucun gagnant → symbole perdant par défaut
  return slots.find(s => s.gain === 0);
}

// ————————————————————————————————
// 5) Pointeur
// ————————————————————————————————
function updatePointer() {
  insigns.forEach((el, i) => {
    el.style.boxShadow = (i === current) ? "0 0 20px red" : "none";
  });
}

// ————————————————————————————————
// 6) Stats & RTP
// ————————————————————————————————
let totalGames = 0, totalGains = 0, totalMises = 0;

function updateStats(gain) {
  totalGames++;
  totalMises += 500;
  totalGains += gain;
  const rtp = (totalGains / totalMises) * 100;
  document.getElementById("gamesPlayed").textContent = totalGames;
  document.getElementById("totalGains").textContent  = `${totalGains.toLocaleString()} FCFA`;
  document.getElementById("rtp").textContent         = rtp.toFixed(2) + " %";
}

// ————————————————————————————————
// 7) Animation titre
// ————————————————————————————————
function animateTitle(message) {
  clearInterval(titleInterval);
  let visible = true;
  document.title = message;
  titleInterval = setInterval(() => {
    document.title = visible ? message : "🎰 Casino Pro 🎰";
    visible = !visible;
  }, 500);
  setTimeout(() => {
    clearInterval(titleInterval);
    document.title = defaultTitle;
  }, 4000);
}

// ————————————————————————————————
// 8) Lancer un spin
// ————————————————————————————————
spinBtn.addEventListener("click", () => {
  spinBtn.disabled = true;
  resultat.textContent = "";

  const sel = pick(rng);
  const symbols = Array.from(insigns).map(el => el.textContent.trim());
  const targetIndex = symbols.indexOf(sel.sym);

  const fullRounds    = Math.floor(rng.extractNumber() * 4) + 4;
  const stepsToTarget = (targetIndex - current + totalInsigns) % totalInsigns;
  const cycles        = fullRounds * totalInsigns + stepsToTarget;

  let count = 0;
  clearInterval(interval);

  interval = setInterval(() => {
    tickSound.currentTime = 0;
    tickSound.play().catch(() => {});
    current = (current + 1) % totalInsigns;
    updatePointer();
    count++;

    if (count >= cycles) {
      clearInterval(interval);
      balance += sel.gain;
      updateStats(sel.gain);

      if (sel.gain > 0) {
        winSound.currentTime = 0;
        winSound.play().catch(() => {});
        animateTitle(`💰 JACKPOT : ${sel.gain.toLocaleString()} FCFA ! 💰`);
        resultat.textContent = `🎉 Gagné : ${sel.gain.toLocaleString()} FCFA avec ${sel.sym}`;
      } else {
        resultat.textContent = `❌ Rien... (${sel.sym})`;
      }
      balanceEl.textContent = `${balance.toLocaleString()} FCFA`;
      spinBtn.disabled = false;
    }
  }, speed);
});

// ————————————————————————————————
// 9) Animation fond lumineux
// ————————————————————————————————
for (let i = 0; i < 60; i++) {
  const dot = document.createElement('div');
  dot.classList.add('glow-dot');
  dot.style.top  = Math.random() * window.innerHeight + 'px';
  dot.style.left = Math.random() * window.innerWidth  + 'px';
  document.body.appendChild(dot);
}
