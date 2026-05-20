/**
 * AerospaceOpsPanel.js - Custom High-Fidelity Management Dashboard for Aviation Sector
 * Manage automatic crew staffing, active hangar fleet conditions, bulk aircraft purchases,
 * and strategic airport terminal boarding gate expansions.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../UIManager.js';
import { AIRCRAFT_CATALOG, AIRPORT_TIERS } from '../../business/sectors/AerospaceSector.js';

/**
 * Local utility for premium compact currency formatting
 */
const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const AerospaceOpsPanel = {
    render(biz) {
        const aero = businessManager.getAerospaceState();
        if (!aero) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi penerbangan...</p>`;

        const fleet = aero.fleet || [];
        const airports = aero.airports || [];
        const demand = aero.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);
        const crewCount = aero.crewCount || 4;

        let totalPaxCap = 0;
        let totalAptMaint = 0;
        airports.forEach(a => {
            totalPaxCap += a.paxCapacity;
            totalAptMaint += a.maintenance;
        });

        // Compute total crew required by fleet
        let totalCrewRequired = 0;
        fleet.forEach(p => {
            totalCrewRequired += (p.crewRequired || 4);
        });

        // Hired crew count always automatically matches total crew required
        const staffRatio = 1.0;
        const staffRatioPercent = 100;

        // Calculate total carrying capacity pax of non-grounded fleet
        let totalFlightPaxCapacity = 0;
        let totalFlightPaxFlown = 0;
        fleet.forEach(p => {
            const cond = p.condition !== undefined ? p.condition : 100;
            if (cond < 40) return; // Grounded plane cannot fly
            
            const maxCapacity = (p.capacity * p.flightsPerMonth);
            totalFlightPaxCapacity += maxCapacity;

            const loadFactor = Math.min(1.0, demand);
            totalFlightPaxFlown += (maxCapacity * loadFactor);
        });

        // Check terminal saturation percentage
        const fillPercent = totalPaxCap > 0 ? (totalFlightPaxCapacity / totalPaxCap) * 100 : 100;
        const isSaturated = fillPercent >= 80;

        const activeTerminals = airports.map(a => `<span style="background: rgba(16,185,129,0.08); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; border: 1px solid rgba(16,185,129,0.2); white-space: nowrap;">${a.name}</span>`).join('');

        // Aircraft Market Cards
        const aircraftMarketHtml = AIRCRAFT_CATALOG.map(plane => {
            const isWide = plane.type === 'Wide-body' || plane.type === 'Jumbo Jet';
            const icon = isWide ? '✈️' : '🛩️';
            const canAfford = biz.cash >= plane.price;
            
            return `
                <div class="card" style="padding: 1.25rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 0.75rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 800; text-transform: uppercase;">${plane.type}</div>
                            <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">${plane.name}</div>
                        </div>
                        <div style="font-size: 2rem;">${icon}</div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between;"><span>Kapasitas (Pax):</span> <strong style="color: #fff;">${plane.capacity} kursi</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Kebutuhan Kru:</span> <strong style="color: #fbbf24;">${plane.crewRequired || 4} Orang</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Jadwal / Bln:</span> <strong style="color: #fff;">${plane.flightsPerMonth} rute</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Harga Tiket:</span> <strong style="color: #10b981;">$ ${plane.ticketPrice}</strong></div>
                    </div>

                    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-size: 1.05rem; font-weight: 900; color: #f59e0b;">$ ${formatCompact(plane.price)}</div>
                            <!-- Quantity selector for bulk buying -->
                            <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px;">
                                <span style="font-size: 0.65rem; color: var(--text-dim); padding-right: 4px;">Qty:</span>
                                <input type="number" class="buy-qty-input" data-plane-id="${plane.id}" value="1" min="1" max="100" style="width: 32px; border: none; background: transparent; color: #fff; font-weight: 800; font-size: 0.8rem; outline: none; text-align: center;">
                            </div>
                        </div>
                        <button class="btn btn-sm btn-buy-plane ${canAfford ? 'btn-primary' : 'btn-gold'}" data-id="${plane.id}" style="font-weight: 800; padding: 6px 12px; border-radius: 6px; width: 100%;">
                            ${canAfford ? 'BELI ARMADA' : 'SUNTIK MODAL'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Terminals Market List (Locked if fillPercent < 80%)
        const terminalMarketHtml = AIRPORT_TIERS.map(apt => {
            const canAfford = biz.cash >= apt.price;
            const isLocked = !isSaturated;
            
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.1); margin-bottom: 0.5rem; opacity: ${isLocked ? 0.6 : 1.0};">
                    <div style="flex: 1;">
                        <div style="font-weight: 800; color: #fff; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🏢 ${apt.name}</span>
                            ${isLocked ? `<span style="background: rgba(239,68,68,0.15); color: #f87171; font-size: 0.55rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.25);">TERKUNCI</span>` : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Kapasitas Boarding: <span style="color:#10b981;">${apt.paxCapacity.toLocaleString()} Pax/bln</span> | Maintenance: $ ${formatCompact(apt.maintenance)}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-weight: 900; color: #f59e0b;">$ ${formatCompact(apt.price)}</div>
                        ${isLocked ? `
                        <button class="btn btn-sm btn-build-airport" disabled style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-dim); cursor: not-allowed; font-weight: 800;">LOCKED</button>
                        ` : `
                        <button class="btn btn-sm btn-build-airport ${canAfford ? 'btn-primary' : 'btn-gold'}" data-id="${apt.id}">BANGUN</button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        // Hangar active fleet conditions
        const activeFleetHtml = fleet.length === 0 ? `
            <div style="padding: 2.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                📭 Hangar kosong. Beli armada pertamamu di bursa pesawat di bawah.
            </div>
        ` : fleet.map(plane => {
            const cond = plane.condition !== undefined ? plane.condition : 100;
            const age = plane.ageMonths !== undefined ? plane.ageMonths : 0;
            
            let condColor = '#10b981';
            if (cond < 40) {
                condColor = '#ef4444';
            } else if (cond < 75) {
                condColor = '#f59e0b';
            }

            const repairCost = Math.round(plane.price * (1 - cond / 100) * 0.35);
            const isPerfect = cond >= 100;
            const isGrounded = cond < 40;

            const resaleValue = Math.round(plane.price * (cond / 100) * 0.60);

            return `
                <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: ${isGrounded ? 'rgba(239,68,68,0.02)' : 'transparent'};">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                            <span style="font-weight: 800; color: #fff; font-size: 0.9rem;">${plane.name}</span>
                            <span style="font-size: 0.6rem; color: var(--text-dim); background: rgba(255,255,255,0.04); padding: 1px 5px; border-radius: 4px; font-family: monospace;">#${plane.id}</span>
                            ${isGrounded ? `
                            <span style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25); font-size: 0.55rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;">GROUNDED</span>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 1rem; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.5rem; flex-wrap: wrap;">
                            <span>Tipe: <strong style="color: #ccc;">${plane.type}</strong></span>
                            <span>Kru: <strong style="color: #ccc;">${plane.crewRequired || 4} Orang</strong></span>
                            <span>Masa Pakai: <strong style="color: #ccc;">${age} bulan</strong></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 100px; height: 5px; background: rgba(255,255,255,0.04); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${cond}%; height: 100%; background: ${condColor}; transition: width 0.3s;"></div>
                            </div>
                            <span style="font-size: 0.72rem; font-weight: 800; color: ${condColor}">${cond}% Kondisi</span>
                        </div>
                    </div>

                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; min-width: 155px;">
                        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; font-size: 0.62rem; color: var(--text-dim); text-transform: uppercase;">
                            <span>🔧 Servis</span>
                            <span>💰 Nilai Jual</span>
                        </div>
                        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center; font-size: 0.85rem; font-weight: 900; margin-bottom: 0.15rem;">
                            <span style="color: ${isPerfect ? 'var(--text-dim)' : '#f59e0b'};">${isPerfect ? '—' : '$ ' + formatCompact(repairCost)}</span>
                            <span style="color: #10b981;">$ ${formatCompact(resaleValue)}</span>
                        </div>
                        <div style="display: flex; gap: 4px; width: 100%; justify-content: flex-end;">
                            <button class="btn btn-sm btn-repair-plane" data-id="${plane.id}" ${isPerfect ? 'disabled' : ''} style="font-weight: 800; font-size: 0.62rem; padding: 4px 8px; border-radius: 4px; background: ${isPerfect ? 'rgba(255,255,255,0.03)' : '#059669'}; border: none; color: ${isPerfect ? 'var(--text-dim)' : '#fff'}; cursor: ${isPerfect ? 'not-allowed' : 'pointer'};">
                                🔧 SERVIS
                            </button>
                            <button class="btn btn-sm btn-sell-plane" data-id="${plane.id}" data-name="${plane.name}" data-value="${resaleValue}" style="font-weight: 800; font-size: 0.62rem; padding: 4px 8px; border-radius: 4px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171; cursor: pointer; transition: all 0.2s;">
                                💰 JUAL
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Compute total repair overhaul cost
        let totalOverhaulCost = 0;
        fleet.forEach(p => {
            const cond = p.condition !== undefined ? p.condition : 100;
            if (cond < 100) {
                totalOverhaulCost += Math.round(p.price * (1 - cond / 100) * 0.35);
            }
        });

        return `
            <div class="aerospace-tab-wrapper" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Skala Armada Maskapai</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #3b82f6;">${fleet.length} Pesawat</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Daya Angkut Aktual: ~${Math.round(totalFlightPaxFlown).toLocaleString()} Pax/bln</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015); display: flex; flex-direction: column; justify-content: space-between; min-height: 140px;">
                        <div>
                            <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kapasitas Terminal (Boarding)</div>
                            <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">${totalPaxCap.toLocaleString()} Pax</div>
                        </div>
                        <div style="font-size: 0.72rem; margin-top: 0.5rem; color: var(--text-dim); display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-weight: 800; font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Infrastruktur Aktif:</span>
                            <div style="max-height: 48px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.03); border-radius: 6px;" class="custom-scroll">
                                ${activeTerminals || '<span style="color: var(--text-dim); font-size: 0.65rem;">Tidak ada terminal aktif</span>'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Rasio Boarding Terisi (Utilisasi)</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${isSaturated ? '#10b981' : '#f59e0b'};">${Math.round(fillPercent)}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">${totalFlightPaxCapacity.toLocaleString()} / ${totalPaxCap.toLocaleString()} Pax</div>
                    </div>

                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Tingkat Kepadatan Rute (Demand)</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandPercent > 100 ? '#10b981' : '#ec4899'};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Tergantung fluktuasi ekonomi global</div>
                    </div>
                </div>

                <!-- Strategic Management Blocks: Crew Staffing & Aircraft Hangar Maintenance -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
                    
                    <!-- Crew Staffing Management Panel (Automatic Staffing Hub) -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(59,130,246,0.03) 0%, transparent 100%);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #3b82f6; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>👥</span> Manajemen Otomatis Kru Maskapai (Flight Crew)
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.2rem; line-height: 1.4;">
                            Divisi HRD maskapai mengelola rekrutmen, penempatan, dan sertifikasi secara otomatis. Setiap kali Anda membeli pesawat baru, staf kru langsung direkrut dan ditempatkan tanpa perlu input manual. Gaji kru penerbangan aktif adalah <strong>$2.500/bulan</strong>.
                        </p>

                        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 10px; display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Status Kru Penerbangan</div>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #10b981;">✓ Terisi Otomatis</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Total Kru Aktif</div>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #fff;">${crewCount} Anggota</div>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                                <span>Total Pengeluaran Gaji Bulanan:</span>
                                <strong style="color: #ef4444;">$ ${(crewCount * 2500).toLocaleString()} / bln</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Hangar & Condition Maintenance Management Panel -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(16,185,129,0.03) 0%, transparent 100%); display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #10b981; display: flex; align-items: center; gap: 0.5rem;">
                                <span>🔧</span> Status Hangar & Kondisi Pemeliharaan Armada
                            </h3>
                            <button class="btn btn-sm" id="btn-repair-all" ${totalOverhaulCost === 0 ? 'disabled' : ''} style="font-weight: 950; background: #059669; border: none; padding: 6px 14px; font-size: 0.72rem; border-radius: 6px; color: #fff; cursor: ${totalOverhaulCost === 0 ? 'not-allowed' : 'pointer'}; opacity: ${totalOverhaulCost === 0 ? 0.5 : 1}; transition: all 0.2s;">
                                Overhaul Seluruh Armada ($ ${totalOverhaulCost.toLocaleString()})
                            </button>
                        </div>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.2rem; line-height: 1.4;">
                            Kondisi pesawat akan aus secara berkala tiap bulan. Pesawat dengan kondisi di bawah <strong>40%</strong> akan otomatis masuk status <strong>Grounded</strong> dan dilarang terbang demi keselamatan!
                        </p>

                        <div style="flex: 1; max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 10px; background: rgba(0,0,0,0.15);">
                            ${activeFleetHtml}
                        </div>
                    </div>
                </div>

                <!-- Strategic Investments: Terminals & Airport Construction -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
                    
                    <!-- Terminals Expansion Panel -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🏢</span> Ekspansi Terminal & Konstruksi Bandara
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.2rem; line-height: 1.4;">
                            Tambah bandara atau terminal baru untuk menampung armada pesawat Anda. Anda tidak bisa sembarangan melakukan ekspansi terminal; pastikan kapasitas terminal saat ini telah terutilisasi oleh pesawat aktif minimal <strong>80%</strong> sebelum melakukan ekspansi!
                        </p>

                        <!-- Airport Expansion Saturation Checker -->
                        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 10px; display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem;">
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                                    <span>Rasio Utilisasi Boarding Bandara Saat Ini</span>
                                    <span style="font-weight: 800; color: ${isSaturated ? '#10b981' : '#f59e0b'}">${Math.round(fillPercent)}%</span>
                                </div>
                                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${Math.min(100, fillPercent)}%; height: 100%; background: ${isSaturated ? '#10b981' : '#f59e0b'}; transition: width 0.3s;"></div>
                                </div>
                                ${!isSaturated ? `
                                <div style="margin-top: 0.75rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 6px; padding: 6px 10px; font-size: 0.7rem; color: #f87171; line-height: 1.3;">
                                    ⚠️ <strong>Ekspansi Bandara Terkunci!</strong> Kapasitas terminal bandara saat ini masih kosong. Penuhi minimal <strong>80%</strong> kapasitas pintu boarding bandara dengan membeli armada pesawat baru sebelum diizinkan berekspansi!
                                </div>
                                ` : `
                                <div style="margin-top: 0.75rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 6px; padding: 6px 10px; font-size: 0.7rem; color: #34d399; line-height: 1.3;">
                                    ✓ <strong>Ekspansi Diizinkan!</strong> Kapasitas bandara Anda saat ini telah terisi secara memadai (${Math.round(fillPercent)}%). Anda bebas merintis konstruksi terminal berikutnya!
                                </div>
                                `}
                            </div>
                        </div>

                        ${terminalMarketHtml}

                        <!-- Demolish Built active airports section -->
                        <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 1.25rem;">
                            <h4 style="margin: 0 0 0.75rem 0; font-size: 0.85rem; font-weight: 900; color: #f87171; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;">
                                <span>🏢</span> Terminal Aktif & Area Dekonstruksi
                            </h4>
                            <p class="text-muted" style="font-size: 0.7rem; margin-bottom: 1rem; line-height: 1.4;">
                                Robohkan infrastruktur terminal bandara yang tidak terpakai untuk memulihkan **50% biaya rekonstruksi** awal secara tunai dan menghemat pemeliharaan bulanan.
                            </p>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 160px; overflow-y: auto;" class="custom-scroll">
                                ${airports.map(apt => {
                                    const refund = Math.round(apt.price * 0.5);
                                    return `
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.03); border-radius: 6px; background: rgba(0,0,0,0.15);">
                                            <div>
                                                <div style="font-weight: 800; color: #fff; font-size: 0.8rem;">${apt.name}</div>
                                                <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Kapasitas: ${apt.paxCapacity.toLocaleString()} Pax | Ref: +$ ${formatCompact(refund)}</div>
                                            </div>
                                            <button class="btn btn-sm btn-demolish-airport" data-id="${apt.id}" data-name="${apt.name}" data-refund="${refund}" style="font-weight: 900; font-size: 0.62rem; padding: 4px 10px; border-radius: 4px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171; cursor: pointer; transition: all 0.2s;">
                                                💥 ROBOHKAN
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Aviation Global Destinations Card -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 1rem; max-height: 520px; overflow-y: auto;" class="custom-scroll">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🗺️</span> Hub & Destinasi Penerbangan Terpopuler
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 0.5rem; line-height: 1.4;">
                            Negara dengan volume kepadatan rute penerbangan sipil terbesar di dunia. Diurutkan dari mayoritas pengguna/rute tertinggi ke minoritas:
                        </p>

                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <!-- US -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇺🇸 1. Amerika Serikat (USA)</span>
                                    <strong style="color: #3b82f6; font-size: 0.75rem;">926,4M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 100%; height: 100%; background: #3b82f6;"></div>
                                </div>
                            </div>

                            <!-- China -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇨🇳 2. Tiongkok (China)</span>
                                    <strong style="color: #10b981; font-size: 0.75rem;">659,8M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 71%; height: 100%; background: #10b981;"></div>
                                </div>
                            </div>

                            <!-- Ireland -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇮🇪 3. Irlandia (Ireland)</span>
                                    <strong style="color: #a855f7; font-size: 0.75rem;">215,1M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 23%; height: 100%; background: #a855f7;"></div>
                                </div>
                            </div>

                            <!-- India -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇮🇳 4. India</span>
                                    <strong style="color: #f59e0b; font-size: 0.75rem;">190,2M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 20%; height: 100%; background: #f59e0b;"></div>
                                </div>
                            </div>

                            <!-- UK -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇬🇧 5. Britania Raya (UK)</span>
                                    <strong style="color: #ec4899; font-size: 0.75rem;">165,4M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 18%; height: 100%; background: #ec4899;"></div>
                                </div>
                            </div>

                            <!-- Germany -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇩🇪 6. Jerman (Germany)</span>
                                    <strong style="color: #3b82f6; font-size: 0.75rem;">124,3M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 13%; height: 100%; background: #3b82f6;"></div>
                                </div>
                            </div>

                            <!-- Japan -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇯🇵 7. Jepang (Japan)</span>
                                    <strong style="color: #10b981; font-size: 0.75rem;">110,5M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 12%; height: 100%; background: #10b981;"></div>
                                </div>
                            </div>

                            <!-- Turkey -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇹🇷 8. Turki (Turkey)</span>
                                    <strong style="color: #f59e0b; font-size: 0.75rem;">105,2M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 11%; height: 100%; background: #f59e0b;"></div>
                                </div>
                            </div>

                            <!-- UAE -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇦🇪 9. Uni Emirat Arab (UAE)</span>
                                    <strong style="color: #a855f7; font-size: 0.75rem;">95,4M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 10%; height: 100%; background: #a855f7;"></div>
                                </div>
                            </div>

                            <!-- Indonesia -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇮🇩 10. Indonesia</span>
                                    <strong style="color: #ec4899; font-size: 0.75rem;">85,7M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 9%; height: 100%; background: #ec4899;"></div>
                                </div>
                            </div>

                            <!-- Singapore -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇸🇬 11. Singapura (Singapore)</span>
                                    <strong style="color: #3b82f6; font-size: 0.75rem;">68,2M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 7%; height: 100%; background: #3b82f6;"></div>
                                </div>
                            </div>

                            <!-- Australia -->
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.35rem;">
                                    <span style="font-weight: 800; color: #fff;">🇦🇺 12. Australia</span>
                                    <strong style="color: #10b981; font-size: 0.75rem;">61,5M Pax / thn</strong>
                                </div>
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
                                    <div style="width: 6%; height: 100%; background: #10b981;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Aircraft Fleet Market (Bursa Pesawat) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.1rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🛫</span> Bursa Pesawat & Pembelian Armada Maskapai
                    </h3>
                    <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
                        Beli armada komersial berskala global dari pabrikan Airbus, Boeing, dan Bombardier. Input jumlah ("Qty") pesawat yang ingin Anda beli secara langsung untuk mengejar target kapasitas penumpang Anda!
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem;">
                        ${aircraftMarketHtml}
                    </div>
                </div>

            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Repair Plane
        container.querySelectorAll('.btn-repair-plane').forEach(btn => {
            btn.addEventListener('click', () => {
                const planeId = btn.dataset.id;
                try {
                    businessManager.repairAircraft(planeId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Repair All Fleet
        const btnRepairAll = container.querySelector('#btn-repair-all');
        if (btnRepairAll) {
            btnRepairAll.addEventListener('click', () => {
                try {
                    businessManager.repairAllFleet();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Buy Aircraft (Bulk support!)
        container.querySelectorAll('.btn-buy-plane').forEach(btn => {
            btn.addEventListener('click', async () => {
                const planeId = btn.dataset.id;
                const qtyInput = container.querySelector(`.buy-qty-input[data-plane-id="${planeId}"]`);
                const qty = qtyInput ? parseInt(qtyInput.value) : 1;

                if (isNaN(qty) || qty <= 0) {
                    ui.error('Jumlah pembelian pesawat tidak valid!');
                    return;
                }

                const confirmed = await ui.confirm({
                    title: `Beli ${qty} Pesawat Baru?`,
                    message: `Apakah Anda yakin ingin membeli armada pesawat ini sebanyak ${qty} unit sekaligus? Kru penerbangan yang bersangkutan akan direkrut secara otomatis.`,
                    confirmText: 'Beli Sekarang'
                });
                if (confirmed) {
                    try {
                        businessManager.buyAircraft(planeId, qty);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Build Terminal
        container.querySelectorAll('.btn-build-airport').forEach(btn => {
            btn.addEventListener('click', async () => {
                const aptId = btn.dataset.id;
                try {
                    businessManager.buildAirport(aptId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Sell Aircraft
        container.querySelectorAll('.btn-sell-plane').forEach(btn => {
            btn.addEventListener('click', async () => {
                const planeId = btn.dataset.id;
                const planeName = btn.dataset.name;
                const saleValue = parseInt(btn.dataset.value);

                const confirmed = await ui.confirm({
                    title: `Jual Pesawat "${planeName}"?`,
                    message: `Apakah Anda yakin ingin menjual pesawat ini? Anda akan menerima kas sebesar $ ${saleValue.toLocaleString()} secara tunai. Kru penerbangan yang bersangkutan akan dikurangi secara otomatis.`,
                    confirmText: 'Jual Pesawat'
                });
                if (confirmed) {
                    try {
                        businessManager.sellAircraft(planeId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Demolish Airport Terminal
        container.querySelectorAll('.btn-demolish-airport').forEach(btn => {
            btn.addEventListener('click', async () => {
                const aptId = btn.dataset.id;
                const aptName = btn.dataset.name;
                const refund = parseInt(btn.dataset.refund);

                const confirmed = await ui.confirm({
                    title: `Robohkan Terminal "${aptName}"?`,
                    message: `Apakah Anda yakin ingin merobohkan infrastruktur ini? Tindakan ini akan mengembalikan kas sebesar $ ${refund.toLocaleString()} (50% dari harga konstruksi awal) dan memotong kapasitas boarding Anda.`,
                    confirmText: 'Robohkan Sekarang'
                });
                if (confirmed) {
                    try {
                        businessManager.demolishAirport(aptId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default AerospaceOpsPanel;
