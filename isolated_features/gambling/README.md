# Isolated Feature: Gambling & Casino Module

Modul ini diasingkan dari game utama AuraAssets.
Modul ini mencakup seluruh engine mini-game kasino:
- **Goldy Crush Slot (6x3)**: `js/casino/SlotEngine.js`
- **Mahjong Ways Slot**: `js/casino/MahjongSlotEngine.js`
- **Zeus Gates Slot**: `js/casino/ZeusSlotEngine.js`
- **Mega Lottery (Togel)**: `js/casino/LotteryEngine.js`
- **Spinning Wheel (Roda Keberuntungan)**: `js/casino/WheelEngine.js`
- **Parlay Sports Betting**: `js/casino/ParlayEngine.js`
- **Casino Hub Panel**: `js/GamblingPanel.js`
- **Slot Unicode & SVG Icons**: `js/casino/SlotIcons.js`

## Dependencies Asli:
- `core/GameState.js` (saldo kasino, ratePlays, freeSpins, bonusSpins, lotteryTokens)
- `finance/FinanceManager.js` (formatCurrency, addIncome, recordExpense)
- `trading/CryptoMarket.js` (pembayaran crypto di wheel engine)
- `ui/UIManager.js` & `ui/ViewManager.js` (showDynamicView & toasts)
