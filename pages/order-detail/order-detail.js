// pages/order-detail/order-detail.js
const { api } = require('../../utils/request');
const { formatPrice, formatTime, orderStatusInfo, formatPickupCode, firstImage } = require('../../utils/util');

Page({
  data: {
    orderId: null,
    order: null,
    loading: true,
    showPickupCode: false,
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.setData({ orderId: id });
    this._loadOrder(id);
  },

  onShow() {
    if (this.data.orderId) this._loadOrder(this.data.orderId);
  },

  _loadOrder(id) {
    api.orderDetail(id)
      .then(res => {
        const o = res.data || res;
        const statusInfo = orderStatusInfo(o.status);
        const items = o.items || o.orderItems || [];
        const firstItem = items[0] || {};
        // 仓库信息从 items 里取
        const warehouseName = o.warehouseName || firstItem.warehouseName || '灵狐仓库';
        const warehouseAddress = o.warehouseAddress || firstItem.warehouseAddress || '';
        // 兼容 PENDING_PAY / PENDING_PAYMENT 两种状态名
        const normalizedStatus = o.status === 'PENDING_PAY' ? 'PENDING_PAYMENT' : o.status;
        const order = {
          ...o,
          status: normalizedStatus,
          warehouseName,
          warehouseAddress,
          statusLabel: statusInfo.label,
          statusColor: statusInfo.color,
          statusDesc: statusInfo.desc || '',
          priceStr: formatPrice(o.totalAmount || o.actualAmount),
          timeStr: formatTime(o.createdAt || o.createTime),
          pickupCodeDisplay: o.pickUpCode ? formatPickupCode(o.pickUpCode) : '',
          showPickup: (normalizedStatus === 'PENDING_DELIVERY' || normalizedStatus === 'DELIVERING') && o.pickUpCode,
          itemList: items.map(item => ({
            ...item,
            thumb: firstImage(item.productImage || item.images || item.imageList) || item.imageUrl || '',
            priceStr: formatPrice(item.price),
          })),
        };
        this.setData({ order, loading: false });
        wx.setNavigationBarTitle({ title: `订单 ${o.orderSn || ''}` });
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },

  copyOrderSn() {
    const sn = this.data.order?.orderSn;
    if (!sn) return;
    wx.setClipboardData({
      data: sn,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  copyPickupCode() {
    const code = this.data.order?.pickUpCode;
    if (!code) return;
    wx.setClipboardData({
      data: String(code),
      success: () => wx.showToast({ title: '自提码已复制', icon: 'success' }),
    });
  },

  cancelOrder() {
    const { orderId, order } = this.data;
    if (!order || order.status !== 'PENDING_PAYMENT') return;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        api.cancelOrder(orderId)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已取消', icon: 'success' });
            this._loadOrder(orderId);
          })
          .catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'error' });
          });
      },
    });
  },

  payOrder() {
    const { orderId, order } = this.data;
    if (!order || order.status !== 'PENDING_PAYMENT') return;
    wx.showLoading({ title: '支付中...' });
    // 开发环境 mock 支付
    api.mockPay({ orderId })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '支付成功', icon: 'success' });
        setTimeout(() => this._loadOrder(orderId), 800);
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '支付失败，请重试', icon: 'error' });
      });
  },

  contactService() {
    wx.makePhoneCall({ phoneNumber: '400-000-0000' });
  },
});
