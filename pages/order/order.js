// pages/order/order.js
const { api } = require('../../utils/request');
const { formatPrice, formatTime, orderStatusInfo, firstImage } = require('../../utils/util');

const TABS = [
  { label: '全部', status: '' },
  { label: '待付款', status: 'PENDING_PAYMENT' },
  { label: '待自提', status: 'PENDING_DELIVERY' },
  { label: '已完成', status: 'FINISHED' },
  { label: '已取消', status: 'CANCELLED' },
];

Page({
  data: {
    tabs: TABS,
    activeTab: 0,
    orders: [],
    loading: true,
    refreshing: false,
    page: 1,
    pageSize: 10,
    hasMore: true,
  },

  onLoad(options) {
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/profile/profile' }), 1000);
      return;
    }
    // 支持从外部跳入指定 tab
    if (options.tab) {
      const idx = TABS.findIndex(t => t.status === options.tab);
      if (idx >= 0) this.setData({ activeTab: idx });
    }
    this._loadOrders(true);
  },

  onShow() {
    // 每次显示刷新
    const app = getApp();
    if (app.globalData.token) {
      this._loadOrders(true);
    }
  },

  switchTab(e) {
    const idx = e.currentTarget.dataset.index;
    if (idx === this.data.activeTab) return;
    this.setData({ activeTab: idx, orders: [], page: 1, hasMore: true });
    this._loadOrders(true);
  },

  _loadOrders(reset = false) {
    if (reset) {
      this.setData({ page: 1, hasMore: true, loading: true });
    }
    const { activeTab, page, pageSize } = this.data;
    const status = TABS[activeTab].status;
    const params = { page, pageSize };
    if (status) params.status = status;

    api.orderList(params)
      .then(res => {
        const data = res.data || res;
        const list = (data.list || data.records || data || []).map(o => this._mapOrder(o));
        const newOrders = reset ? list : [...this.data.orders, ...list];
        this.setData({
          orders: newOrders,
          loading: false,
          refreshing: false,
          hasMore: list.length >= pageSize,
        });
      })
      .catch(() => {
        this.setData({ loading: false, refreshing: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },

  _mapOrder(o) {
    const statusInfo = orderStatusInfo(o.status);
    const items = o.items || o.orderItems || [];
    const firstItem = items[0] || {};
    return {
      ...o,
      statusLabel: statusInfo.label,
      statusColor: statusInfo.color,
      thumb: firstImage(firstItem.images || firstItem.imageList) || firstItem.imageUrl || '',
      itemName: firstItem.productName || firstItem.name || '商品',
      itemCount: items.length,
      priceStr: formatPrice(o.totalAmount || o.actualAmount),
      timeStr: formatTime(o.createdAt || o.createTime),
    };
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this._loadOrders(false);
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this._loadOrders(true);
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },

  goShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  cancelOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消这个订单吗？',
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '取消中...' });
        api.cancelOrder(id)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已取消', icon: 'success' });
            this._loadOrders(true);
          })
          .catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'error' });
          });
      },
    });
  },
});
