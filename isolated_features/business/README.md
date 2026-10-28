# Isolated Feature: Enterprise & Corporate Business Module

Modul ini diasingkan dari game utama AuraAssets.
Modul ini mencakup seluruh engine operasional bisnis korporat, holding subsidiaries, dan IPO:

## Sub-Komponen:
1. **Business Lifecycle & Manager**: `js/BusinessManager.js`
2. **Dashboard Korporat & Tab Navigation**: `js/BusinessPage.js`
3. **M&A & Corporate Auctions**: `js/BusinessAuctions.js`
4. **Tata Kelola / Board of Directors & Deviden**: `js/CorporateGovernance.js`
5. **Inisiatif Strategis Sektor**: `js/IndustryInitiatives.js`
6. **Rival AI Korporasi**: `js/AICompetitor.js`
7. **12 Sector Simulation Engines** (`js/sectors/`):
   - TechSector, AerospaceSector, AutomotiveSector, EnergySector, FinanceSector, FnBSector, HealthcareSector, InfrastructureSector, ManufacturingSector, MediaSector, PropertySector, RetailSector.
8. **12 Sector Operational Panels** (`js/panels/ops/`):
   - TechOpsPanel, AerospaceOpsPanel, AutomotiveOpsPanel, EnergyOpsPanel, FinanceOpsPanel, FnBOpsPanel, HealthcareOpsPanel, InfrastructureOpsPanel, ManufacturingOpsPanel, MediaOpsPanel, PropertyOpsPanel, RetailOpsPanel.
9. **Panels Pendukung**:
   - `js/panels/BoardPanel.js`
   - `js/panels/BusinessChart.js`
   - `js/panels/BusinessOpsTab.js`
   - `js/panels/IPOPanel.js`
   - `js/panels/SetupWizardPanel.js`
   - `js/panels/SubsidiaryPanel.js`
10. **Stylesheet**: `css/business.css`

## HTML Shell Terkait:
- `#company-dashboard` di dashboard utama
- `#business-page` (dynamic modal & full overlay container)
