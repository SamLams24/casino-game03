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
// 2) Init du jeu & "échauffement" du PRNG
// ————————————————————————————————
const rng = new MersenneTwister(Date.now());
// Warm‑up pour décaler la séquence initiale
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
// 3) Table des symboles & probabilités
//    (gains moyens plus fréquents, gros gains rares)
// ————————————————————————————————
// POUR JEU DE 100 FR
const slots = [
  { sym: '🍒', gain:  200,  prob: 0.008    },
  { sym: '💎', gain:  300,  prob: 0.006    },
  { sym: '🔔', gain:    0,  prob: 0.7      },
  { sym: '🍋', gain:  100,  prob: 0.006    },
  { sym: '⭐', gain:  500,  prob: 0.002    },
  { sym: '💰', gain: 1000,  prob: 0.0002   },
  { sym: '☘️', gain:    0,  prob: 0.27779  },
  { sym: '👑', gain: 2000,  prob: 0.00001  }
];

// POUR JEU DE 500FR
// const slots = [
//   { sym: '🍒', gain:  200, prob: 0.20 },   // 20%
//   { sym: '💎', gain:  300, prob: 0.15 },   // 15%
//   { sym: '🔔', gain:    0, prob: 0.20 },   // 20%
//   { sym: '🍋', gain:  100, prob: 0.20 },   // 20%
//   { sym: '⭐', gain:  500, prob: 0.10 },   // 10%
//   { sym: '💰',gain: 1000, prob: 0.03 },   //  3%
//   { sym: '☘️',gain:    0, prob: 0.10 },   // 10%
//   { sym: '👑',gain: 2000, prob: 0.02 }    //  2%
// ];

// Tirage pondéré (stable, pas de shuffle)
function pick(rng) {
  const r = rng.extractNumber();
  let sum = 0;
  for (const s of slots) {
    sum += s.prob;
    if (r <= sum) return s;
  }
  return slots[slots.length - 1];
}

// ————————————————————————————————
// 4) Mise à jour de l’affichage du pointeur
// ————————————————————————————————
function updatePointer() {
  insigns.forEach((el, i) => {
    el.style.boxShadow = (i === current) ? "0 0 20px red" : "none";
  });
}

// ————————————————————————————————
// 5) Stats & RTP
// ————————————————————————————————
let totalGames = 0;
let totalGains = 0;
let totalMises = 0;

function updateStats(gain) {
  totalGames++;
  totalMises += 500;       // coût fixe par tour
  totalGains += gain;
  const rtp = (totalGains / totalMises) * 100;
  document.getElementById("gamesPlayed").textContent = totalGames;
  document.getElementById("totalGains").textContent  = `${totalGains.toLocaleString()} FCFA`;
  document.getElementById("rtp").textContent         = rtp.toFixed(2) + " %";
}

// Animation du titre en cas de gain
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
// 6) Lancement du spin (une seule fois)
// ————————————————————————————————
spinBtn.addEventListener("click", () => {
  // UX : désactive le bouton pendant l’animation
  spinBtn.disabled = true;
  resultat.textContent = "";

  // 1) On détermine d’abord le symbole gagnant
  const sel = pick(rng);
  const symbols = Array.from(insigns).map(el => el.textContent.trim());
  const targetIndex = symbols.indexOf(sel.sym);

  // 2) Calcul du nombre de pas (tours complets + offset)
  const fullRounds    = Math.floor(rng.extractNumber() * 4) + 4; // 4 à 7 tours
  const stepsToTarget = (targetIndex - current + totalInsigns) % totalInsigns;
  const cycles        = fullRounds * totalInsigns + stepsToTarget;

  let count = 0;
  clearInterval(interval);

  interval = setInterval(() => {
    // effet sonore "tic"
    tickSound.currentTime = 0;
    tickSound.play().catch(() => {});

    // on avance first, puis on éclaire
    current = (current + 1) % totalInsigns;
    updatePointer();

    count++;
    if (count >= cycles) {
      clearInterval(interval);

      // Affichage du résultat
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

      // réactive le bouton
      spinBtn.disabled = false;
    }
  }, speed);
});

// ————————————————————————————————
// 7) Fond lumineux animé
// ————————————————————————————————
for (let i = 0; i < 60; i++) {
  const dot = document.createElement('div');
  dot.classList.add('glow-dot');
  dot.style.top  = Math.random() * window.innerHeight + 'px';
  dot.style.left = Math.random() * window.innerWidth  + 'px';
  document.body.appendChild(dot);
}
