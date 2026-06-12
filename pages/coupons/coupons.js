// pages/coupons/coupons.js
const couponUtil = require('../../utils/coupon');

Page({
  data: {
    tabs: [
      { label: '未使用', key: 'unused' },
      { label: '已使用', key: 'used' },
      { label: '已过期', key: 'expired' },
    ],
    activeTab: 0,
    coupons: [],
  },

  onShow() {
    this._loadCoupons();
  },

  _loadCoupons() {
    const { activeTab } = this.data;
    const key = this.data.tabs[activeTab].key;
    const all = couponUtil.getMyCoupons();
    const now = Date.now();

    let list = [];
    if (key === 'unused') {
      list = all.filter(c => !c.used && new Date(c.expireDate).getTime() > now);
    } else if (key === 'used') {
      list = all.filter(c => c.used);
    } else {
      list = all.filter(c => !c.used && new Date(c.expireDate).getTime() <= now);
    }
    this.setData({ coupons: list });
  },

  switchTab(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ activeTab: idx });
    this._loadCoupons();
  },

  goShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
