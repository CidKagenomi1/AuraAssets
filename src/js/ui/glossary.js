/**
 * glossary.js - Financial & Game Glossary Dictionary & Popover Manager
 * Provides concise, beginner-friendly explanations for financial and trading terms.
 * Supports both touch (mobile) and click/hover (desktop).
 */

export const GLOSSARY_TERMS = {
  fear_greed: {
    title: 'Fear & Greed Index',
    shortDesc: 'Indikator sentimen emosional pasar (0–100). Angka rendah (<40) menandakan ketakutan pasar (harga murah), sedangkan angka tinggi (>60) menandakan keserakahan (waspada pembalikan arah).'
  },
  ytd: {
    title: 'YTD (Year-To-Date)',
    shortDesc: 'Persentase perubahan nilai aset atau portofolio yang dihitung sejak hari pertama tahun kalender berjalan hingga hari ini.'
  },
  cashflow: {
    title: 'Arus Kas (Cashflow)',
    shortDesc: 'Aliran kas bersih bulanan: total pendapatan gaji dan dividen/bunga dikurangi beban cicilan utang dan biaya hidup bulanan.'
  },
  apy: {
    title: 'APY (Annual Percentage Yield)',
    shortDesc: 'Estimasi persentase keuntungan tahunan jika hasil bunga atau staking diinvestasikan kembali (bunga berbunga / compound interest).'
  },
  nav: {
    title: 'NAB / NAV (Nilai Aktiva Bersih)',
    shortDesc: 'Harga wajar per satu unit penyertaan Reksa Dana atau ETF berdasarkan total portofolio aset yang dikelola secara profesional.'
  },
  volatility: {
    title: 'Volatilitas',
    shortDesc: 'Tingkat fluktuasi pergerakan naik-turun harga suatu aset. Semakin tinggi volatilitas, potensi keuntungan sekaligus risiko kerugiannya semakin besar.'
  },
  staking: {
    title: 'Staking PoS',
    shortDesc: 'Mengunci sejumlah aset kripto di jaringan blockchain untuk mendukung validasi transaksi dan memperoleh imbal hasil pasif secara teratur.'
  },
  launchpool: {
    title: 'Launchpool / Launchdrop',
    shortDesc: 'Program peluncuran token kripto baru. Pemain bisa mendapatkan token gratis hanya dengan mengunci saldo aset tanpa biaya tambahan.'
  },
  lot: {
    title: 'Lot Saham',
    shortDesc: 'Satuan standar pembelian saham bursa. Di pasar simulasi ini, 1 lot setara dengan 100 lembar saham.'
  },
  liquidation: {
    title: 'Harga Likuidasi',
    shortDesc: 'Batas harga kritis di mana posisi trading berisiko ditutup paksa untuk mencegah total kerugian melebihi modal jaminan.'
  },
  risk_profile: {
    title: 'Profil Risiko Investor',
    shortDesc: 'Tingkat kesiapan menghadapi fluktuasi pasar: Konservatif (prioritas keamanan), Moderat (keseimbangan), atau Agresif (mengejar potensi keuntungan maksimal).'
  },
  market_cap: {
    title: 'Kapitalisasi Pasar (Market Cap)',
    shortDesc: 'Total nilai pasar suatu perusahaan atau aset kripto, dihitung dari harga per lembar dikalikan total saham atau koin yang beredar.'
  },
  dividend: {
    title: 'Dividen',
    shortDesc: 'Bagian dari keuntungan perusahaan yang dibagikan secara berkala kepada pemegang saham berdasarkan jumlah lot yang dimiliki.'
  }
};

let activePopoverEl = null;

export function showGlossaryPopover(termKey, targetEl) {
  const termData = GLOSSARY_TERMS[termKey];
  if (!termData || !targetEl) return;

  // Remove existing popover if open
  closeGlossaryPopover();

  const popover = document.createElement('div');
  popover.id = 'glossary-popover';
  popover.className = 'glossary-popover';
  popover.innerHTML = `
    <div class="glossary-popover-header">
      <span class="glossary-popover-title">${termData.title}</span>
      <button type="button" class="glossary-popover-close" aria-label="Tutup Penjelasan">×</button>
    </div>
    <div class="glossary-popover-body">
      ${termData.shortDesc}
    </div>
  `;

  document.body.appendChild(popover);
  activePopoverEl = popover;

  // Calculate position
  const rect = targetEl.getBoundingClientRect();
  const popoverWidth = Math.min(300, window.innerWidth - 32);
  popover.style.width = `${popoverWidth}px`;

  let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
  if (left < 16) left = 16;
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }

  let top = rect.bottom + 8;
  // If overflows bottom, position above target
  if (top + 120 > window.innerHeight && rect.top > 120) {
    top = rect.top - 100;
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top + window.scrollY)}px`;

  // Bind close button
  popover.querySelector('.glossary-popover-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeGlossaryPopover();
  });

  // Auto-dismiss on click outside
  setTimeout(() => {
    const handleOutsideClick = (e) => {
      if (!popover.contains(e.target) && !targetEl.contains(e.target)) {
        closeGlossaryPopover();
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
  }, 10);
}

export function closeGlossaryPopover() {
  if (activePopoverEl) {
    activePopoverEl.remove();
    activePopoverEl = null;
  }
}

export function initGlossary() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-glossary]');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const termKey = trigger.dataset.glossary;
      showGlossaryPopover(termKey, trigger);
    }
  });
}

export default {
  GLOSSARY_TERMS,
  showGlossaryPopover,
  closeGlossaryPopover,
  initGlossary
};

