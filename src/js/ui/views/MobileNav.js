/**
 * MobileNav.js - Bottom Navigation Bar and Detailed Services List Modal for Mobile
 * Part of modular views structure
 */

import roleManager from '../../core/RoleManager.js';
import ui from '../UIManager.js';

export function updateMobileBottomNav(activeView, onViewSwitch) {
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (!bottomNav) return;

    // Get current role
    const role = roleManager.getRoleData();
    if (!role) {
      bottomNav.innerHTML = '';
      return;
    }

    // Define all navigation items with SVG icons
    const navItems = {
      home: { id: 'home', label: 'Beranda', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>` },
      market: { id: 'market', label: 'Pasar', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/></svg>` },
      portfolio: { id: 'portfolio', label: 'Portofolio', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>` },
      property: { id: 'property', label: 'Properti', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>` }
    };

    // Bottom Row (Dominant) Candidates
    const primaryIds = ['home', 'market', 'portfolio', 'property'];
    let bottomItems = primaryIds
      .filter(id => id === 'home' || !role.hiddenNav.includes(id))
      .map(id => navItems[id]);

    // Check if activeView is not in primaryIds (so it's a secondary view like loan/savings/etc.)
    const isSecondaryActive = !primaryIds.includes(activeView);

    // Append "Lainnya" (Menu) button at the end
    bottomItems.push({
      id: 'menu',
      label: 'Lainnya',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zm6-12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.68-1.5-1.5-1.5zm6-18c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.68-1.5-1.5-1.5z"/></svg>`
    });

    let html = '';

    // Render Bottom Row - Main / Active Prominent - Icons only
    html += `
      <div class="bottom-nav-tier tier-bottom" style="
        display: grid;
        grid-template-columns: repeat(${bottomItems.length}, 1fr);
        width: 100%;
        height: 52px;
        align-items: center;
        justify-items: center;
        background: rgba(24, 24, 27, 0.95);
        box-sizing: border-box;
      ">
        ${bottomItems.map(item => {
          const isMenu = item.id === 'menu';
          const isActive = isMenu ? isSecondaryActive : (item.id === activeView);
          if (isActive) {
            return `
              <button class="bottom-nav-tier-btn nav-btn active prominent" data-view="${item.id}" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, var(--accent-primary) 0%, #059669 100%);
                border: none;
                color: #000;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                z-index: 20;
                cursor: pointer;
                transition: all 0.2s ease;
                transform: translateY(-4px);
              ">
                <span style="display: flex; align-items: center; justify-content: center; transform: scale(1.1);">${item.icon}</span>
              </button>
            `;
          } else {
            return `
              <button class="bottom-nav-tier-btn nav-btn" data-view="${item.id}" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                color: var(--text-muted);
                width: 100%;
                height: 100%;
                cursor: pointer;
                transition: all 0.2s ease;
              ">
                <span style="display: flex; align-items: center; justify-content: center;">${item.icon}</span>
              </button>
            `;
          }
        }).join('')}
      </div>
    `;

    bottomNav.innerHTML = html;

    // Bind navigation events
    bottomNav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'menu') {
          showMobileMenu(onViewSwitch);
        } else if (typeof onViewSwitch === 'function') {
          onViewSwitch(view);
        }
      });
    });
}

export function showMobileMenu(onViewSwitch) {
    const role = roleManager.getRoleData();
    if (!role) return;

    const navItems = {
      property: {
        id: 'property',
        label: 'Properti',
        group: 'finance',
        tag: 'Real Estate',
        desc: 'Beli & sewa unit properti komersial, peroleh passive income sewa harian.',
        bg: 'rgba(16, 185, 129, 0.14)',
        color: '#34d399',
        borderColor: 'rgba(16, 185, 129, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>`
      },
      loan: {
        id: 'loan',
        label: 'Pinjaman Bank',
        group: 'finance',
        tag: 'Likuiditas',
        desc: 'Akses modal pinjaman bank instan atau bayar cicilan berbunga terjangkau.',
        bg: 'rgba(59, 130, 246, 0.14)',
        color: '#60a5fa',
        borderColor: 'rgba(59, 130, 246, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>`
      },
      savings: {
        id: 'savings',
        label: 'Deposito Aman',
        group: 'finance',
        tag: 'Bunga Majemuk',
        desc: 'Simpan dana kas likuid dengan akumulasi bunga harian tanpa risiko pasar.',
        bg: 'rgba(245, 158, 11, 0.14)',
        color: '#fbbf24',
        borderColor: 'rgba(245, 158, 11, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`
      },
      tax: {
        id: 'tax',
        label: 'Pajak & Fiskal',
        group: 'finance',
        tag: 'Kepatuhan',
        desc: 'Lapor & bayar kewajiban pajak aset serta capital gain agar bebas audit/denda.',
        bg: 'rgba(244, 63, 94, 0.14)',
        color: '#fb7185',
        borderColor: 'rgba(244, 63, 94, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2l-1.5 1.5L6 2l-1.5 1.5L3 2v20z"/></svg>`
      },
      history: {
        id: 'history',
        label: 'Riwayat Transaksi',
        group: 'finance',
        tag: 'Audit Trail',
        desc: 'Rekam jejak komprehensif transaksi bursa, dividen, dan seluruh mutasi kas.',
        bg: 'rgba(6, 182, 212, 0.14)',
        color: '#22d3ee',
        borderColor: 'rgba(6, 182, 212, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`
      },
      marketplace: {
        id: 'marketplace',
        label: 'Marketplace',
        group: 'lifestyle',
        tag: 'Gaya Hidup',
        desc: 'Beli kendaraan mewah, barang prestisius, dan inventaris peningkat reputasi.',
        bg: 'rgba(168, 85, 247, 0.14)',
        color: '#c084fc',
        borderColor: 'rgba(168, 85, 247, 0.28)',
        icon: `🛒`
      },
      donate: {
        id: 'donate',
        label: 'Donasi & Amal',
        group: 'lifestyle',
        tag: 'Filantropi',
        desc: 'Salurkan bantuan kemanusiaan untuk mendongkrak reputasi dan relasi publik.',
        bg: 'rgba(236, 72, 153, 0.14)',
        color: '#f472b6',
        borderColor: 'rgba(236, 72, 153, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4V8h16v11z"/></svg>`
      },
      guide: {
        id: 'guide',
        label: 'Panduan Bermain',
        group: 'system',
        tag: 'Edukasi',
        desc: 'Pelajari taktik analisis bursa, strategi portofolio, dan rahasia sukses finansial.',
        bg: 'rgba(99, 102, 241, 0.14)',
        color: '#818cf8',
        borderColor: 'rgba(99, 102, 241, 0.28)',
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>`
      },
      settings: {
        id: 'settings',
        label: 'Pengaturan Sistem',
        group: 'system',
        tag: 'Preferensi',
        desc: 'Sesuaikan audio sfx, tema antarmuka, reset permainan, dan cadangan data akun.',
        bg: 'rgba(148, 163, 184, 0.14)',
        color: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        icon: `⚙️`
      },
      notifications: {
        id: 'notifications',
        label: 'Pusat Notifikasi',
        group: 'system',
        tag: 'Pemberitahuan',
        desc: 'Lihat seluruh peringatan dividen masuk, lonjakan bursa, dan breaking news.',
        bg: 'rgba(251, 191, 36, 0.14)',
        color: '#fde047',
        borderColor: 'rgba(251, 191, 36, 0.28)',
        icon: `🔔`
      }
    };

    const secondaryIds = ['property', 'loan', 'savings', 'tax', 'history', 'marketplace', 'donate', 'guide', 'settings', 'notifications'];
    const activeItems = secondaryIds
      .filter(id => !role.hiddenNav.includes(id))
      .map(id => navItems[id]);

    const groups = [
      { key: 'finance', title: '💼 Keuangan & Portofolio', items: activeItems.filter(i => i.group === 'finance') },
      { key: 'lifestyle', title: '🛍️ Lifestyle & Sosial', items: activeItems.filter(i => i.group === 'lifestyle') },
      { key: 'system', title: '⚙️ Bantuan & Pengaturan', items: activeItems.filter(i => i.group === 'system') }
    ];

    const content = `
      <div class="mobile-menu-container">
        ${groups.filter(g => g.items.length > 0).map(g => `
          <div class="mobile-menu-group">
            <div class="mobile-menu-group-title">
              ${g.title}
            </div>
            ${g.items.map(item => `
              <div class="mobile-menu-item-row menu-item-mobile-row" data-menu-id="${item.id}">
                <div class="mobile-menu-icon-box" style="background:${item.bg}; color:${item.color}; border: 1px solid ${item.borderColor};">
                  ${item.icon}
                </div>
                <div class="mobile-menu-content">
                  <div class="mobile-menu-title-row">
                    <span class="mobile-menu-label">${item.label}</span>
                    <span class="mobile-menu-tag">${item.tag}</span>
                  </div>
                  <div class="mobile-menu-desc">${item.desc}</div>
                </div>
                <div class="mobile-menu-chevron">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;

    ui.showModal({
      title: '⚡ Menu Layanan & Fitur',
      content,
      onShow: () => {
        document.querySelectorAll('.menu-item-mobile-row').forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.menuId;
            ui.closeModal();
            if (id === 'settings') {
              import('../HomeScreen.js').then(m => m.default.showSettings());
            } else if (id === 'notifications') {
              import('../HomeScreen.js').then(m => m.default.showNotifications());
            } else if (typeof onViewSwitch === 'function') {
              onViewSwitch(id);
            }
          });
        });
      }
    });
}
