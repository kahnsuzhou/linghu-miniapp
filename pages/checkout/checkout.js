// pages/checkout/checkout.js
const { api } = require('../../utils/request');
const { formatPrice, allImages } = require('../../utils/util');
const couponUtil = require('../../utils/coupon');

Page({
  data: {
    productId: null,
    quantity: 1,
    product: null,
    loading: true,
    submitting: false,

    // 收货方式（固定自提）
    pickupWarehouses: [],    // 可选仓库列表
    selectedWarehouseIndex: 0,
    selectedWarehouse: null,

    // 优惠券
    coupons: [],
    selectedCoupon: null,
    showCouponPicker: false,

    // 金额
    totalAmount: 0,
    discountAmount: 0,
    finalAmount: 0,

    // 备注
    remark: '',
  },

  onLoad(options) {
    const { productId, quantity } = options;
    if (!productId) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    this.setData({
      productId,
      quantity: parseInt(quantity) || 1,
    });
    this._loadProduct(productId);
  },

  _loadProduct(id) {
    api.productDetail(id)
      .then(res => {
        const p = res.data || res;
        const thumb = (allImages(p.images || p.imageList))[0] || '';
        const product = {
          ...p,
          thumb,
          priceStr: formatPrice(p.price),
        };
        const totalAmount = p.price * this.data.quantity;
        // 可选仓库
        const warehouses = p.pickupLocations || p.warehouses || [
          { id: p.warehouseId, name: p.warehouseName || '附近仓库', address: p.warehouseAddress || '' }
        ];
        this.setData({
          product,
          pickupWarehouses: warehouses,
          selectedWarehouse: warehouses[0] || null,
          totalAmount,
          loading: false,
        });
        this._calcAmount();
        this._loadCoupons(totalAmount);
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },

  _loadCoupons(amount) {
    const coupons = couponUtil.getAvailableCoupons(amount);
    // 如果有可用券，自动选第一张
    const selectedCoupon = coupons.length > 0 ? coupons[0] : null;
    this.setData({ coupons, selectedCoupon });
    this._calcAmount(selectedCoupon);
  },

  _calcAmount(coupon) {
    const c = coupon !== undefined ? coupon : this.data.selectedCoupon;
    const total = this.data.totalAmount;
    const result = couponUtil.calcFinalAmount(total, c);
    this.setData({
      discountAmount: result.discount,
      finalAmount: result.final,
    });
  },

  onWarehouseChange(e) {
    const idx = e.detail.value;
    const wh = this.data.pickupWarehouses[idx];
    this.setData({ selectedWarehouseIndex: idx, selectedWarehouse: wh });
  },

  openCouponPicker() {
    this.setData({ showCouponPicker: true });
  },

  closeCouponPicker() {
    this.setData({ showCouponPicker: false });
  },

  selectCoupon(e) {
    const { id } = e.currentTarget.dataset;
    const coupon = this.data.coupons.find(c => c.id === id);
    this.setData({ selectedCoupon: coupon, showCouponPicker: false });
    this._calcAmount(coupon);
  },

  deselectCoupon() {
    this.setData({ selectedCoupon: null, showCouponPicker: false });
    this._calcAmount(null);
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  submitOrder() {
    if (this.data.submitting) return;
    const { product, quantity, selectedWarehouse, selectedCoupon, remark, finalAmount } = this.data;
    if (!product) return;
    if (!selectedWarehouse) {
      wx.showToast({ title: '请选择自提仓库', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    const pid = product.id || product.productId;
    const wid = selectedWarehouse.id || selectedWarehouse.warehouseId;
    const orderData = {
      items: [{ productId: pid, quantity, warehouseId: wid }],  // 每个item需带warehouseId
      deliveryMode: 'pickup',
      couponId: selectedCoupon ? selectedCoupon.id : null,
      remark,
      totalAmount: finalAmount,
    };

    api.createOrder(orderData)
      .then(res => {
        wx.hideLoading();
        const orderRes = res.data || res;
        const orderId = orderRes.id || orderRes.orderId;
        const orderSn = orderRes.orderSn || orderRes.sn;

        // 如果用了优惠券，标记已使用
        if (selectedCoupon) {
          couponUtil.useCoupon(selectedCoupon.id);
        }

        // 调起微信支付
        if (orderRes.payInfo) {
          this._wxPay(orderRes.payInfo, orderId, orderSn);
        } else {
          // mock支付（开发模式）
          this._mockPay(orderId, orderSn);
        }
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ submitting: false });
        const msg = (err && err.message) ? err.message : '下单失败，请重试';
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
      });
  },

  _wxPay(payInfo, orderId, orderSn) {
    wx.requestPayment({
      timeStamp: payInfo.timeStamp,
      nonceStr: payInfo.nonceStr,
      package: payInfo.package,
      signType: payInfo.signType || 'RSA',
      paySign: payInfo.paySign,
      success: () => {
        this.setData({ submitting: false });
        wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
      },
      fail: (err) => {
        this.setData({ submitting: false });
        if (err.errMsg && err.errMsg.includes('cancel')) {
          wx.showToast({ title: '已取消支付', icon: 'none' });
          // 跳到订单页，用户可以再次支付
          wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
        } else {
          wx.showToast({ title: '支付失败', icon: 'error' });
        }
      },
    });
  },

  _mockPay(orderId, orderSn) {
    // 开发环境 mock 支付
    api.mockPay({ orderId })
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '下单成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
        }, 800);
      })
      .catch(() => {
        this.setData({ submitting: false });
        wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
      });
  },
});
