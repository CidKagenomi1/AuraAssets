/**
 * SetupWizardPanel.js - Modular Business Initialization and Registration Wizard
 * Handles the step-by-step company registration, corporate entity type choice (UMKM vs Startup),
 * name validation, and official deed incorporation.
 */

import gameState from '../../core/GameState.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../../ui/UIManager.js';

export const SetupWizardPanel = {
    selectedType: 'umkm',

    render(container, parentPage) {
        container.innerHTML = `
            <div class="panel-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem; position: sticky; top: 0; background: var(--bg-root); z-index: 10;">
                <button class="btn-back" id="biz-back" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">←</button>
                <h2 class="section-title" style="margin:0;"><span>🏢</span> Inisialisasi Entitas Bisnis Baru</h2>
            </div>
            
            <div style="padding: 1.5rem; max-width: 900px; margin: 0 auto; width: 100%;">
                <div id="biz-step-1">
                    <div style="text-align: center; margin-bottom: 2.5rem;">
                        <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; background: linear-gradient(90deg, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 0.05em;">PILIH STRUKTUR PERUSAHAAN</h1>
                        <p class="text-muted">Tentukan model bisnis awal Anda untuk dikembangkan.</p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                        <!-- UMKM Option -->
                        <div class="biz-type-card action-btn" data-type="umkm" style="
                            padding: 2.2rem; border: 1px solid var(--border-color); border-radius: 20px; 
                            cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
                            position: relative; overflow: hidden;
                        ">
                            <div style="font-size: 3.5rem; margin-bottom: 1.5rem;">🏪</div>
                            <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.75rem; color: #fff;">USAHA MANDIRI (UMKM)</h3>
                            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5;">Perusahaan berorientasi pada kas positif sejak hari pertama. Stabil, berisiko rendah, dan mudah dikelola.</p>
                            
                            <div style="background: rgba(16, 185, 129, 0.08); padding: 0.75rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid rgba(16, 185, 129, 0.15);">
                                <div style="font-size: 0.65rem; color: var(--accent-primary); font-weight: 800; text-transform: uppercase;">Modal Awal</div>
                                <div style="font-size: 1.35rem; font-weight: 900; color: var(--accent-primary);">$ 10,000</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: var(--accent-primary);">✓</span> Profit Harian</div>
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: var(--accent-primary);">✓</span> Risiko Rendah</div>
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: var(--accent-primary);">✓</span> Ekspansi Cabang</div>
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: var(--accent-primary);">✓</span> Arus Kas Cepat</div>
                            </div>
                        </div>

                        <!-- Startup Option -->
                        <div class="biz-type-card action-btn" data-type="startup" style="
                            padding: 2.2rem; border: 1px solid var(--border-color); border-radius: 20px; 
                            cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            background: linear-gradient(180deg, rgba(129, 140, 248, 0.04) 0%, transparent 100%);
                            position: relative; overflow: hidden;
                        ">
                            <div style="position: absolute; top: 1.2rem; right: 1.2rem; background: #fbbf24; color: #000; font-size: 0.65rem; font-weight: 900; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.05em;">HIGH SCALABILITY</div>
                            <div style="font-size: 3.5rem; margin-bottom: 1.5rem;">🚀</div>
                            <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.75rem; color: #818cf8;">TECH STARTUP</h3>
                            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5;">Perusahaan inovasi teknologi berskala global. Butuh modal bakar di awal demi meraih traksi pasar dan IPO raksasa.</p>
                            
                            <div style="background: rgba(129, 140, 248, 0.08); padding: 0.75rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid rgba(129, 140, 248, 0.15);">
                                <div style="font-size: 0.65rem; color: #818cf8; font-weight: 800; text-transform: uppercase;">Modal Awal</div>
                                <div style="font-size: 1.35rem; font-weight: 900; color: #818cf8;">$ 50,000</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: #818cf8;">✓</span> Valuasi Tinggi</div>
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: #818cf8;">✓</span> Venture Funding</div>
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: #818cf8;">✓</span> Skala Multi-Regional</div>
                                <div style="font-size: 0.8rem; color: var(--text-dim);"><span style="color: #818cf8;">✓</span> Listing Bursa (IPO)</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Formal Registration Certificate -->
                <div id="biz-step-2" class="hidden" style="margin-top: 1rem; display: none;">
                    <div style="
                        background: #fcfcfc; color: #151515; padding: 3rem 2rem; border-radius: 12px;
                        border: 12px double #cfa830; position: relative; 
                        box-shadow: 0 25px 50px rgba(0,0,0,0.6);
                    ">
                        <div style="position:absolute; top: 12px; left: 12px; width: 45px; height: 45px; border-top: 4px solid #cfa830; border-left: 4px solid #cfa830;"></div>
                        <div style="position:absolute; top: 12px; right: 12px; width: 45px; height: 45px; border-top: 4px solid #cfa830; border-right: 4px solid #cfa830;"></div>
                        
                        <div style="text-align: center; margin-bottom: 2.5rem;">
                            <div style="font-size: 0.75rem; letter-spacing: 0.4em; font-weight: 800; color: #777; margin-bottom: 0.5rem; font-family: sans-serif;">REGISTRASI PENDATAAN BADAN HUKUM</div>
                            <h2 style="font-family: Georgia, serif; font-size: 2.2rem; font-weight: 500; margin: 0; color: #111;">AKTA PENDIRIAN PERUSAHAAN</h2>
                            <div style="width: 120px; height: 2px; background: #cfa830; margin: 1.2rem auto;"></div>
                        </div>

                        <div style="font-family: Georgia, serif; font-size: 1.15rem; line-height: 1.8; margin-bottom: 2.5rem; color: #222; text-align: center;">
                            Dengan ini menyatakan bahwa entitas komersial di bawah kendali direktur utama<br>
                            <strong>${gameState.get('player.name')}</strong> akan diajukan dengan rincian berikut:
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr; gap: 2.2rem; margin-bottom: 3.5rem;">
                            <div style="border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">
                                <label style="font-size: 0.75rem; color: #888; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Nama Perusahaan / Corporate Name</label>
                                <input type="text" id="biz-name-input" placeholder="Tuliskan nama perusahaan Anda..." 
                                    style="width: 100%; border: none; background: transparent; font-size: 1.8rem; font-family: Georgia, serif; font-weight: 700; color: #111; outline: none; padding: 0.25rem 0;">
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                                <div style="border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">
                                    <label style="font-size: 0.75rem; color: #888; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Sektor Bisnis Utama</label>
                                    <select id="biz-industry-select" style="width: 100%; border: none; background: transparent; font-size: 1.25rem; font-family: Georgia, serif; font-weight: 700; color: #111; outline: none; cursor: pointer; padding: 0.25rem 0;">
                                        <option value="tech">Digital Technology</option>
                                        <option value="media">Media</option>
                                        <option value="finance">Jasa Keuangan</option>
                                        <option value="energy">Energi & Utilitas</option>
                                        <option value="aerospace">Maskapai Penerbangan</option>
                                        <option value="manufacturing">Manufacture</option>
                                        <option value="transportation">Transportation</option>
                                        <option value="healthcare">Kesehatan & Bioteknologi</option>
                                        <option value="fnb">FnB</option>
                                        <option value="retail">Retail</option>
                                        <option value="infrastructure">Infrastructure</option>
                                        <option value="property">Property</option>
                                    </select>
                                </div>
                                <div style="border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">
                                    <label style="font-size: 0.75rem; color: #888; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Tipe Klasifikasi</label>
                                    <div id="biz-type-display" style="font-size: 1.25rem; font-family: Georgia, serif; font-weight: 700; color: #111; padding-top: 0.25rem;">—</div>
                                </div>
                            </div>

                            <!-- Dynamic Sub-Sector Selection Row -->
                            <div id="biz-subsector-row" style="border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; display: none; margin-top: 1.5rem;">
                                <label style="font-size: 0.75rem; color: #888; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Pilih Sub-Sektor Utama</label>
                                <select id="biz-subsector-select" style="width: 100%; border: none; background: transparent; font-size: 1.25rem; font-family: Georgia, serif; font-weight: 700; color: #111; outline: none; cursor: pointer; padding: 0.25rem 0;">
                                </select>
                            </div>

                            <!-- Custom Startup Capital Field (Only for Startup) -->
                            <div id="startup-capital-row" style="border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; display: none; margin-top: 1.5rem;">
                                <label style="font-size: 0.75rem; color: #888; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Suntik Modal Awal (Startup Capital)</label>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.8rem; font-family: Georgia, serif; font-weight: 700; color: #111;">$</span>
                                    <input type="text" id="biz-capital-input" value="50.000" placeholder="Minimal 25.000"
                                        style="width: 100%; border: none; background: transparent; font-size: 1.8rem; font-family: Georgia, serif; font-weight: 700; color: #111; outline: none; padding: 0.25rem 0;">
                                </div>
                                <span style="font-size: 0.72rem; color: #666; font-style: italic; display: block; margin-top: 4px;">
                                    Minimal $ 25.000. Maksimum (Saldo pribadi Anda): $ <span id="personal-balance-limit" style="font-weight: 800; color: #111;">0</span>
                                </span>
                            </div>
                        </div>

                        <div style="text-align: center;">
                            <button id="btn-start-business" class="btn" style="
                                background: #111; color: #cfa830; border: 2px solid #cfa830;
                                padding: 1.2rem 3.5rem; font-weight: 900; font-size: 1.15rem; 
                                letter-spacing: 0.1em; transition: all 0.3s; cursor: pointer;
                                border-radius: 6px;
                            ">RESMIKAN PENDIRIAN PERUSAHAAN</button>
                            <p style="font-size: 0.75rem; color: #777; margin-top: 1.2rem; font-family: sans-serif;">Persetujuan dokumen ini akan memotong saldo modal pribadi secara legal.</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 2rem;">
                        <button id="btn-cancel-step" style="background: none; border: none; color: var(--text-dim); text-decoration: underline; cursor: pointer; font-size: 0.95rem;">Batal & Pilih Ulang Model</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container, parentPage);
    },

    bindEvents(container, parentPage) {
        container.querySelector('#biz-back').addEventListener('click', () => parentPage.close());

        // Sub-sector choices mapping
        const subSectorMap = {
            manufacturing: [
                { val: 'mobil', label: 'Mobil & Otomotif (Assembly)' },
                { val: 'electronic', label: 'Perangkat Elektronik (High-Tech)' },
                { val: 'furniture', label: 'Furnitur & Mebel (Ergonomic)' }
            ],
            transportation: [
                { val: 'ride_hailing', label: 'Antar Jemput Online (Ride-Hailing)' },
                { val: 'rental', label: 'Penyewaan Kendaraan (Rental)' }
            ],
            fnb: [
                { val: 'restaurant', label: 'Restoran Kuliner (Fine Dining)' },
                { val: 'cafe', label: 'Kafe & Bistro (Coffee Shop)' },
                { val: 'catering', label: 'Katering Industri (Makan Siang)' }
            ]
        };

        const industrySelect = container.querySelector('#biz-industry-select');
        const subSectorRow = container.querySelector('#biz-subsector-row');
        const subSectorSelect = container.querySelector('#biz-subsector-select');
        
        const step1 = container.querySelector('#biz-step-1');
        const step2 = container.querySelector('#biz-step-2');
        const typeCards = container.querySelectorAll('.biz-type-card');
        const typeDisplay = container.querySelector('#biz-type-display');
        const capitalRow = container.querySelector('#startup-capital-row');
        const capInput = container.querySelector('#biz-capital-input');

        const updateSubSectorVisibility = () => {
            const indVal = industrySelect.value;
            const subOptions = subSectorMap[indVal];
            if (subOptions) {
                subSectorSelect.innerHTML = subOptions.map(opt => `<option value="${opt.val}">${opt.label}</option>`).join('');
                subSectorRow.style.display = 'block';
            } else {
                subSectorSelect.innerHTML = '';
                subSectorRow.style.display = 'none';
            }
        };

        if (industrySelect) {
            industrySelect.addEventListener('change', updateSubSectorVisibility);
        }

        typeCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectedType = card.dataset.type;
                typeDisplay.textContent = this.selectedType === 'umkm' ? 'Usaha Mandiri (UMKM)' : 'Tech Startup';
                
                step1.style.display = 'none';
                step2.style.display = 'block';
                step2.classList.remove('hidden');

                if (this.selectedType === 'startup') {
                    industrySelect.value = 'tech';
                    if (capitalRow) {
                        capitalRow.style.display = 'block';
                        const balLimit = container.querySelector('#personal-balance-limit');
                        if (balLimit) {
                            const balance = gameState.getBalance();
                            balLimit.textContent = new Intl.NumberFormat('id-ID').format(Math.round(balance));
                        }
                    }
                } else {
                    if (capitalRow) {
                        capitalRow.style.display = 'none';
                    }
                }
                updateSubSectorVisibility();
            });
        });

        container.querySelector('#btn-cancel-step').addEventListener('click', () => {
            step2.style.display = 'none';
            step2.classList.add('hidden');
            step1.style.display = 'block';
        });

        container.querySelector('#btn-start-business').addEventListener('click', () => {
            const name = container.querySelector('#biz-name-input').value.trim();
            const industry = industrySelect.value;
            const subSector = subSectorRow.style.display !== 'none' ? subSectorSelect.value : null;

            if (!name) {
                ui.error('Mohon tentukan nama entitas perusahaan Anda!');
                return;
            }

            let customCapital = null;
            if (this.selectedType === 'startup') {
                if (capInput) {
                    const rawVal = capInput.getNumericValue ? capInput.getNumericValue() : parseFloat(capInput.value.replace(/\./g, '').replace(/,/g, ''));
                    customCapital = parseFloat(rawVal);
                    if (isNaN(customCapital) || customCapital < 25000) {
                        ui.error('Minimal modal awal pendirian Tech Startup adalah $ 25.000!');
                        return;
                    }
                    if (customCapital > gameState.getBalance()) {
                        ui.error('Saldo pribadi Anda tidak mencukupi untuk nominal modal awal tersebut!');
                        return;
                    }
                }
            }

            try {
                businessManager.startBusiness(name, this.selectedType, industry, customCapital, subSector);
                parentPage.render();
            } catch (e) {
                ui.error(e.message);
            }
        });
    }
};

export default SetupWizardPanel;
