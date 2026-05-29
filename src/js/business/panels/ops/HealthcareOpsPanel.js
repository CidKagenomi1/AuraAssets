/**
 * HealthcareOpsPanel.js - Custom Management Dashboard for Healthcare & Biotech Sector
 * Manage automatic doctor & nurse staffing, facility construction,
 * and custom medicine production pipelines.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { FACILITY_CATALOG } from '../../sectors/HealthcareSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const HealthcareOpsPanel = {
    render(biz) {
        const hc = businessManager.getHealthcareState();
        if (!hc) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi kesehatan...</p>`;

        const facilities = hc.facilities || [];
        const medicines = hc.medicines || [];
        const demand = hc.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);
        const doctorCount = hc.doctorCount || 0;
        const nurseCount = hc.nurseCount || 0;

        let totalCapacity = 0;
        let totalMaint = 0;
        facilities.forEach(f => {
            totalCapacity += f.capacity;
            totalMaint += f.maintenance;
        });

        // Facility catalog cards
        const facilityMarketHtml = FACILITY_CATALOG.map(fac => {
            const canAfford = biz.cash >= fac.price;
            return `
                <div class="card" style="padding: 1.25rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 0.75rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-size: 0.7rem; color: #14b8a6; font-weight: 800; text-transform: uppercase;">${fac.type}</div>
                            <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">${fac.name}</div>
                        </div>
                        <div style="font-size: 2rem;">${fac.icon}</div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between;"><span>Kapasitas Pasien:</span> <strong style="color: #fff;">${fac.capacity.toLocaleString()} Jiwa</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Kebutuhan Staf:</span> <strong style="color: #fbbf24;">${fac.doctorRequired} Dr / ${fac.nurseRequired} Prw</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Biaya Maint. Bulanan:</span> <strong style="color: #ef4444;">$ ${fac.maintenance.toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Tarif / Pasien:</span> <strong style="color: #10b981;">$ ${fac.revenuePerPatient}</strong></div>
                    </div>

                    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <div style="font-size: 1.1rem; font-weight: 900; color: #f59e0b;">$ ${formatCompact(fac.price)}</div>
                        <button class="btn btn-sm btn-build-facility ${canAfford ? 'btn-primary' : 'btn-gold'}" data-id="${fac.id}" style="font-weight: 800; padding: 6px 12px; border-radius: 6px; width: 100%;">
                            ${canAfford ? '🛠️ BANGUN FASILITAS' : 'SUNTIK MODAL'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Medicines Inventory list
        const medicineListHtml = medicines.length === 0 ? `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 1.5rem; font-size: 0.8rem;">
                    📭 Belum ada stok obat di penyimpanan. Gunakan formulir produksi di sebelah kiri.
                </td>
            </tr>
        ` : medicines.map(med => {
            let badgeColor = '';
            if (med.color === 'Merah') badgeColor = '#ef4444';
            else if (med.color === 'Biru') badgeColor = '#3b82f6';
            else if (med.color === 'Hijau') badgeColor = '#10b981';
            else badgeColor = '#f59e0b'; // Kuning

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 0.75rem 0.5rem; font-weight: 800; color: #fff;">${med.name}</td>
                    <td style="padding: 0.75rem 0.5rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${med.type}</td>
                    <td style="padding: 0.75rem 0.5rem;">
                        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; font-weight: 700; color: ${badgeColor};">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${badgeColor};"></span>
                            Dosis ${med.color}
                        </span>
                    </td>
                    <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: #fbbf24;">${med.qty.toLocaleString()} Unit</td>
                    <td style="padding: 0.75rem 0.5rem; text-align: right;">
                        <button class="btn btn-sm btn-dispose-medicine" data-id="${med.id}" style="padding: 2px 8px; font-size: 0.6rem; font-weight: 800; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 4px;">
                            🗑️ BUANG
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Facilities list table
        const facilitiesListHtml = facilities.length === 0 ? `
            <div style="padding: 2rem; text-align: center; color: var(--text-dim); font-size: 0.8rem;">
                📭 Belum memiliki fasilitas kesehatan aktif.
            </div>
        ` : facilities.map(fac => {
            const refund = Math.round(fac.price * 0.6);
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.03); border-radius: 6px; background: rgba(0,0,0,0.15); margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.85rem;">${fac.icon} ${fac.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                            Staf: <span style="color: #fbbf24;">${fac.doctorRequired} Dr, ${fac.nurseRequired} Prw</span> | Kapasitas: ${fac.capacity.toLocaleString()} Pasien
                        </div>
                    </div>
                    <button class="btn btn-sm btn-sell-facility" data-id="${fac.id}" data-name="${fac.name}" data-refund="${refund}" style="font-weight: 900; font-size: 0.62rem; padding: 4px 10px; border-radius: 4px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171; transition: all 0.2s;">
                        💰 JUAL (-$ ${formatCompact(refund)})
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="healthcare-tab-wrapper" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #14b8a6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Skala Layanan Kesehatan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #14b8a6;">${facilities.length} Fasilitas</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Klinik, Puskesmas, & Rumah Sakit</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kapasitas Pasien Maksimal</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #3b82f6;">${totalCapacity.toLocaleString()} Jiwa/bln</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Est. Kunjungan: ~${Math.round(totalCapacity * Math.min(1.0, demand)).toLocaleString()} Jiwa</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Total Obat Terdaftar</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">${medicines.length} Formula</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Stok Total: ${medicines.reduce((acc, curr) => acc + curr.qty, 0).toLocaleString()} Unit</div>
                    </div>

                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Wabah / Tingkat Penyakit (Demand)</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandPercent > 100 ? '#ef4444' : '#ec4899'};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Mempengaruhi volume rawat jalan/rawat inap</div>
                    </div>
                </div>

                <!-- Split Layout: HRD Staffing & Medicine Production -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
                    
                    <!-- Crew Staffing Panel -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(20,184,166,0.03) 0%, transparent 100%);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #14b8a6; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🩺</span> Manajemen Otomatis Tenaga Medis
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.2rem; line-height: 1.4;">
                            Sistem rekrutmen dokter dan perawat berjalan secara otomatis terintegrasi dengan penambahan klinik dan rumah sakit. Tenaga medis aktif mendapatkan gaji bulanan tetap: Dokter <strong>$6.000/bln</strong> & Perawat <strong>$2.500/bln</strong>.
                        </p>

                        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 10px; display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">🩺 Dokter Aktif</div>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #fff;">${doctorCount} Dokter</div>
                                    <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Gaji: $ 6.000 / bln</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">👩‍⚕️ Perawat Aktif</div>
                                    <div style="font-size: 1.35rem; font-weight: 900; color: #fff;">${nurseCount} Perawat</div>
                                    <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Gaji: $ 2.500 / bln</div>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                                <span>Total Biaya Payroll Tenaga Medis:</span>
                                <strong style="color: #ef4444;">$ ${((doctorCount * 6000) + (nurseCount * 2500)).toLocaleString()} / bln</strong>
                            </div>
                        </div>
                        
                        <!-- Demolish section -->
                        <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 1.25rem;">
                            <h4 style="margin: 0 0 0.75rem 0; font-size: 0.85rem; font-weight: 900; color: #f87171; text-transform: uppercase; letter-spacing: 0.05em;">
                                🏭 Jaringan Fasilitas & Likuidasi
                            </h4>
                            <div style="max-height: 160px; overflow-y: auto;" class="custom-scroll">
                                ${facilitiesListHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Medicine Production Pipeline -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(59,130,246,0.03) 0%, transparent 100%); display: flex; flex-direction: column;">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #3b82f6; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>💊</span> Laboratorium Farmasi & Penyediaan Obat
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1rem; line-height: 1.4;">
                            Racik dan produksi obat untuk disuplai ke pasien di klinik/rumah sakit. Pasien rawat jalan memiliki peluang 60% untuk menebus obat seharga <strong>$4 per unit</strong>. Biaya bahan baku pembuatan obat flat <strong>$1 per unit</strong>.
                        </p>

                        <!-- Medicine Manufacturing Form -->
                        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.75rem;">
                            <div>
                                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Nama Formula Obat</label>
                                <input type="text" id="med-name-input" placeholder="Contoh: Paracetamol, Amoxicillin, dll." style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.8rem; box-sizing: border-box;">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <div>
                                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Jenis Obat</label>
                                    <select id="med-type-select" style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.8rem; height: 32px;">
                                        <option value="pil">Pil / Tablet</option>
                                        <option value="sirup">Sirup Cair</option>
                                        <option value="kapsul">Kapsul Bubuk</option>
                                        <option value="salep">Salep Kulit</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Warna Kemasan Dosis</label>
                                    <select id="med-color-select" style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.8rem; height: 32px;">
                                        <option value="Biru" style="color: #3b82f6;">Biru (Umum/Bebas)</option>
                                        <option value="Merah" style="color: #ef4444;">Merah (Keras/Resep)</option>
                                        <option value="Hijau" style="color: #10b981;">Hijau (Herbal/Alami)</option>
                                        <option value="Kuning" style="color: #f59e0b;">Kuning (Khusus/Terbatas)</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.75rem; align-items: flex-end;">
                                <div style="flex: 1;">
                                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Jumlah Produksi</label>
                                    <input type="number" id="med-qty-input" value="1000" min="1" step="100" style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.8rem; box-sizing: border-box; height: 32px;">
                                </div>
                                <button class="btn btn-primary" id="btn-produce-medicine" style="font-weight: 800; height: 32px; padding: 0 16px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap;">
                                    💊 PRODUKSI OBAT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section: Medicine Storage & Catalog -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📦</span> Penyimpanan Inventori Obat Aktif
                    </h3>
                    <div style="overflow-x: auto; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                    <th style="padding: 0.5rem; font-weight: 800;">Nama Obat</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Tipe</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Kategori Dosis</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Jumlah Stok</th>
                                    <th style="padding: 0.5rem; text-align: right; font-weight: 800;">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${medicineListHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Construction Catalog (Bursa Pembangunan) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.1rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🏗️</span> Konstruksi Fasilitas Kesehatan Baru
                    </h3>
                    <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
                        Konstruksi klinik kecil, puskesmas kecamatan, atau rumah sakit umum berskala besar untuk menampung volume pasien yang lebih tinggi. Setiap fasilitas langsung mempekerjakan dokter dan perawat sesuai spesifikasi secara otomatis.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem;">
                        ${facilityMarketHtml}
                    </div>
                </div>

            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Build Healthcare Facility
        container.querySelectorAll('.btn-build-facility').forEach(btn => {
            btn.addEventListener('click', async () => {
                const facId = btn.dataset.id;
                const model = FACILITY_CATALOG.find(f => f.id === facId);
                if (!model) return;

                const confirmed = await ui.confirm({
                    title: `Bangun ${model.name}?`,
                    message: `Apakah Anda yakin ingin mengeluarkan kas sebesar $ ${model.price.toLocaleString()} untuk membangun fasilitas medis ini? Staf dokter dan perawat akan langsung dipekerjakan otomatis.`,
                    confirmText: 'Mulai Konstruksi'
                });
                if (confirmed) {
                    try {
                        businessManager.buildHealthcareFacility(facId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Sell Healthcare Facility
        container.querySelectorAll('.btn-sell-facility').forEach(btn => {
            btn.addEventListener('click', async () => {
                const facId = btn.dataset.id;
                const facName = btn.dataset.name;
                const refund = parseInt(btn.dataset.refund);

                const confirmed = await ui.confirm({
                    title: `Jual ${facName}?`,
                    message: `Apakah Anda yakin ingin menjual fasilitas kesehatan ini? Anda akan menerima kas sebesar $ ${refund.toLocaleString()} (60% dari harga awal) dan memberhentikan dokter/perawat bersangkutan.`,
                    confirmText: 'Jual Sekarang'
                });
                if (confirmed) {
                    try {
                        businessManager.sellHealthcareFacility(facId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Produce Medicine
        const btnProduce = container.querySelector('#btn-produce-medicine');
        if (btnProduce) {
            btnProduce.addEventListener('click', async () => {
                const nameInput = container.querySelector('#med-name-input');
                const typeSelect = container.querySelector('#med-type-select');
                const colorSelect = container.querySelector('#med-color-select');
                const qtyInput = container.querySelector('#med-qty-input');

                const name = nameInput ? nameInput.value.trim() : '';
                const type = typeSelect ? typeSelect.value : 'pil';
                const color = colorSelect ? colorSelect.value : 'Biru';
                const qty = qtyInput ? parseInt(qtyInput.value) : 1000;

                if (!name) {
                    ui.error('Harap masukkan nama formula obat!');
                    return;
                }
                if (isNaN(qty) || qty <= 0) {
                    ui.error('Jumlah produksi obat tidak valid!');
                    return;
                }

                const totalCost = qty * 1; // unit cost is 1
                const confirmed = await ui.confirm({
                    title: `Produksi Formula Obat?`,
                    message: `Apakah Anda yakin ingin memproduksi ${qty.toLocaleString()} unit obat "${name}" (${type}, kemasan: ${color})? Biaya bahan baku: $ ${totalCost.toLocaleString()}.`,
                    confirmText: 'Mulai Produksi'
                });
                if (confirmed) {
                    try {
                        businessManager.produceMedicine(name, type, color, qty);
                        if (nameInput) nameInput.value = '';
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Dispose Medicine
        container.querySelectorAll('.btn-dispose-medicine').forEach(btn => {
            btn.addEventListener('click', async () => {
                const medId = btn.dataset.id;
                const confirmed = await ui.confirm({
                    title: `Buang Stok Obat?`,
                    message: `Apakah Anda yakin ingin membuang stok formula obat ini dari penyimpanan secara permanen? Tidak ada dana yang dikembalikan.`,
                    confirmText: 'Buang Formula'
                });
                if (confirmed) {
                    try {
                        businessManager.disposeMedicine(medId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default HealthcareOpsPanel;
