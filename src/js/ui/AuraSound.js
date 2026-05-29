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

      const baseFreq = this.randomRange(600, 750);
      const duration = this.randomRange(0.015, 0.025);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
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

      const baseFreq = this.randomRange(1100, 1300); 
      const duration = this.randomRange(0.035, 0.045);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + duration);

      const volume = this.randomRange(0.06, 0.09);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
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
      const pitchMultiplier = this.randomRange(0.95, 1.15); 
      const freqs = [880 * pitchMultiplier, 1320 * pitchMultiplier]; 
      const duration = this.randomRange(0.25, 0.35);

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq - 200, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn("Audio claim play failed:", e);
    }
  }

  // 4. SFX Pembelian / Transaksi Toko (Kasir / Logistik Elektronik)
  static playPurchase() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const baseFreq = 987.77; // Nada B5
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // Naik ke E6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 0.5, now);
      osc2.frequency.setValueAtTime(1318.51 * 0.5, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
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
      const chord = [523.25, 659.25, 783.99]; // C5, E5, G5 (C Major)

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04); // Efek Arpeggio

        gain.gain.setValueAtTime(0.06, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + 0.35);
      });
    } catch (e) {
      console.warn("Audio success alert failed:", e);
    }
  }

  // 6. Info Toast (Dua nada murni berturut-turut harmonis)
  static playInfoAlert() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.07);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn("Audio info alert failed:", e);
    }
  }

  // 7. Warning Toast (Frekuensi alarm bervibrasi cepat)
  static playWarningAlert() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = this.randomRange(260, 300);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(baseFreq + 50, ctx.currentTime + 0.08);
      osc.frequency.linearRampToValueAtTime(baseFreq - 20, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio warning alert failed:", e);
    }
  }

  // 8. Error/Danger Toast (Disonan rendah & tebal, alarm darurat)
  static playErrorAlert() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const freqs = [110, 115]; // Disonansi berat nada rendah

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq - 15, now + 0.3);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      });
    } catch (e) {
      console.warn("Audio error alert failed:", e);
    }
  }
}

export default AuraSound;
