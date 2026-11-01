/**
 * CommoditySubView.js - Physical & Futures Commodity Market Sub-View
 * Delegates rendering and custody actions to CommodityPanel inside the main market container.
 */

import commodityPanel from '../../../trading/panels/CommodityPanel.js';
import commodityManager from '../../../trading/CommodityManager.js';

export class CommoditySubView {
  constructor(options = {}) {
    this.onUpdate = options.onUpdate || (() => {});
  }

  setUpdateCallback(cb) {
    this.onUpdate = cb;
    commodityPanel.onUpdate = cb;
  }

  getCount() {
    return commodityManager.getCommodities().length;
  }

  render(container) {
    if (!container) return;
    commodityPanel.render(container);
  }
}

export const commoditySubView = new CommoditySubView();
export default commoditySubView;

