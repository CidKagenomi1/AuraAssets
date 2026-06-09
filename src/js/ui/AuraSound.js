/**
 * AuraSound.js - Rich Multi-Segmented Sound Effects Engine
 * Custom Web Audio synthesizers for navigations, UI clicks, actions, 
 * and specific notification types (Success, Info, Warning, Error).
 */

class AuraSound {
  static getContext() {
    return new (window.AudioContext || window.webkitAudioContext)();
  }

  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // ==========================================
  // NAVIGATION & KEYBOARD TAPS (Subtle, Organic Taps)
  // ==========================================
  
  // 1. Ketukan Tombol / Key Navigation (Sangat pendek & berongga)
  static playTap() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.015);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    } catch (e) {
      console.warn("Audio tap play failed:", e);
    }
  }

  // 2. Klik Aksi Umum / Navigasi Tab (Lebih renyah & digital)
  static playClick() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch (e) {
      console.warn("Audio click play failed:", e);
    }
  }

  // ==========================================
  // SEGMENTED ACTION SFX
  // ==========================================

  // 3. SFX Klaim Uang / Pendapatan (Bling-bling Sci-Fi)
  static playClaimMoney() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      const playTone = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };

      playTone(1046.50, 0, 0.15); // C6
      playTone(1318.51, 0.06, 0.20); // E6
    } catch (e) {
      console.warn("Audio claim play failed:", e);
    }
  }

  // 4. SFX Pembelian / Transaksi Toko (Kasir / Logistik Elektronik)
  static playPurchase() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const playTone = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.05, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };

      playTone(880, 0, 0.08); // A5
      playTone(1174.66, 0.04, 0.12); // D6
    } catch (e) {
      console.warn("Audio purchase play failed:", e);
    }
  }

  // ==========================================
  // SEGMENTED TOAST/NOTIFICATION ALERTS
  // ==========================================

  // 5. Success Toast (Akor mayor yang ceria & bersih)
  static playSuccessAlert() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      const notes = [659.25, 987.77]; // E5, B5 (Perfect Fifth, warm and professional)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        gain.gain.setValueAtTime(0.04, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.3);
      });
    } catch (e) {
      console.warn("Audio success alert failed:", e);
    }
  }

  // 6. Info Toast (Dua nada murni berturut-turut harmonis)
  static playInfoAlert() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio info alert failed:", e);
    }
  }

  // 7. Warning Toast (Frekuensi alarm bervibrasi cepat)
  static playWarningAlert() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const playTone = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.04, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };

      playTone(554.37, 0, 0.08); // C#5
      playTone(554.37, 0.1, 0.08); // C#5
    } catch (e) {
      console.warn("Audio warning alert failed:", e);
    }
  }

  // 8. Error/Danger Toast (Disonan rendah & tebal, alarm darurat)
  static playErrorAlert() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [293.66, 349.23]; // D4 and F4 (solid and professional minor third)

      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch (e) {
      console.warn("Audio error alert failed:", e);
    }
  }

  // 9. Casino Reel Spin (Rising sweep or repeating mechanical ticks)
  static playCasinoSpin() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Casino spin sound failed:", e);
    }
  }

  // 10. Casino Win Jackpot Fanfare (A fast, retro arpeggio of chimes)
  static playCasinoWin() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6 (Jackpot Arpeggio)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.06, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch (e) {
      console.warn("Casino win sound failed:", e);
    }
  }

  // 11. Casino Lose (Dissonant sliding pitch down)
  static playCasinoLose() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.6);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn("Casino lose sound failed:", e);
    }
  }
}

export default AuraSound;
