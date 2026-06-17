// pages/checkout/checkout.js
const { api } = require('../../utils/request');
const { formatPrice, allImages } = require('../../utils/util');
const couponUtil = require('../../utils/coupon');

const DELIVERY_MODES = [
  { key: 'pickup',   label: '自提',     icon: '🏪' },
  { key: 'delivery', label: '同城配送', icon: '🛵' },
  { key: 'express',  label: '快递',     icon: '📦' },
]

Page({
  data: {
    productId: null,
    warehouseId: null,
    quantity: 1,
    product: null,
    loading: true,
    submitting: false,

    // 配送方式
    deliveryModes: [],        // 该商品支持的配送方式列表
    selectedMode: 'pickup',   // 当前选中的配送方式

    // 自提
    pickupWarehouses: [],
    selectedWarehouseIndex: 0,
    selectedWarehouse: null,

    // 收货地址（同城/快递）
    addresses: [],
    selectedAddress: null,

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

    // 支付密码键盘
    showPayKeyboard: false,
    pendingOrderId: null,   // 下单成功后等待支付的订单ID
    walletBalance: null,    // 钱包余额（展示用）
    hasPayPassword: false,  // 是否已设置支付密码
  },

  onLoad(options) {
    const { productId, quantity, warehouseId } = options;
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
      warehouseId: warehouseId ? parseInt(warehouseId) : null,
      quantity: parseInt(quantity) || 1,
    });
    this._loadProduct(productId, warehouseId);
    this._loadAddresses();
    this._loadWalletInfo();
  },

  onShow() {
    // 从地址页返回时，检查是否有新选择的地址
    const app = getApp();
    if (app.globalData.selectedAddress) {
      this.setData({ selectedAddress: app.globalData.selectedAddress });
      app.globalData.selectedAddress = null;
    }
    // 刷新地址列表
    this._loadAddresses();
  },

  _loadProduct(id, warehouseId) {
    api.productDetail(id)
      .then(res => {
        const p = res.data || res;
        const thumb = (allImages(p.images || p.imageList))[0] || '';
        const product = {
          ...p,
          id: p.id || p.productId,
          thumb,
          priceStr: formatPrice(p.price),
        };
        const totalAmount = p.price * this.data.quantity;

        // 解析支持的配送方式
        let supported = []
        try {
          supported = JSON.parse(p.supportedDeliveries || '[]')
        } catch(e) {
          supported = ['pickup']
        }
        if (!Array.isArray(supported) || supported.length === 0) supported = ['pickup']

        const deliveryModes = DELIVERY_MODES.filter(m => supported.includes(m.key))
        const selectedMode = deliveryModes[0]?.key || 'pickup'

        // 自提仓库
        const wid = warehouseId ? parseInt(warehouseId) : (p.warehouseId || 1);
        const warehouses = p.pickupLocations || p.warehouses || [
          { id: wid, name: p.warehouseName || '附近仓库', address: p.warehouseAddress || '' }
        ];

        this.setData({
          product,
          deliveryModes,
          selectedMode,
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

  _loadWalletInfo() {
    api.walletInfo().then(info => {
      this.setData({
        walletBalance: info.available ?? info.balance ?? 0,
        hasPayPassword: info.hasPayPassword || false,
      });
    }).catch(() => {});
  },

  _loadAddresses() {
    api.addressList().then(list => {
      const addresses = list || []
      // 如果还没有选中地址，自动选默认地址
      if (!this.data.selectedAddress && addresses.length > 0) {
        const def = addresses.find(a => a.isDefault) || addresses[0]
        this.setData({ addresses, selectedAddress: def })
      } else {
        this.setData({ addresses })
      }
    }).catch(() => {})
  },

  selectMode(e) {
    const { mode } = e.currentTarget.dataset
    this.setData({ selectedMode: mode })
  },

  // 去选择/新增地址
  goChooseAddress() {
    wx.navigateTo({ url: '/pages/address/address?select=1' })
  },

  goAddAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  _loadCoupons(amount) {
    const coupons = couponUtil.getAvailableCoupons(amount);
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

  openCouponPicker() { this.setData({ showCouponPicker: true }); },
  closeCouponPicker() { this.setData({ showCouponPicker: false }); },

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
    this.setData({ remark: e.detail.value }); },

  submitOrder() {
    if (this.data.submitting) return;
    const { product, quantity, selectedMode, selectedWarehouse, selectedAddress,
            selectedCoupon, remark, finalAmount } = this.data;
    if (!product) return;

    // 校验
    if (selectedMode === 'pickup') {
      if (!selectedWarehouse) {
        wx.showToast({ title: '请选择自提仓库', icon: 'none' }); return;
      }
    } else {
      if (!selectedAddress) {
        wx.showToast({ title: '请选择收货地址', icon: 'none' }); return;
      }
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    const pid = product.id || product.productId;
    const wid = selectedWarehouse
      ? (selectedWarehouse.id || selectedWarehouse.warehouseId || this.data.warehouseId || 1)
      : this.data.warehouseId || 1;

    const orderData = {
      items: [{ productId: pid, quantity, warehouseId: wid }],
      deliveryMode: selectedMode,
      addressId: (selectedMode !== 'pickup' && selectedAddress) ? selectedAddress.id : null,
      couponId: selectedCoupon ? selectedCoupon.id : null,
      remark,
      totalAmount: finalAmount,
    };

    api.createOrder(orderData)
      .then(res => {
        wx.hideLoading();
        const orderRes = res.data || res;
        const orderId = orderRes.orderId || orderRes.id;
        if (selectedCoupon) couponUtil.useCoupon(selectedCoupon.id);

        // 下单成功，弹出支付密码键盘
        this.setData({ submitting: false, pendingOrderId: orderId, showPayKeyboard: true });
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showToast({ title: (err && err.message) || '下单失败，请重试', icon: 'none', duration: 2500 });
      });
  },

  // 支付密码键盘：输入完成
  onPayConfirm(e) {
    const { password } = e.detail;
    const { pendingOrderId, hasPayPassword } = this.data;

    // 如果未设置支付密码，引导先设置
    if (!hasPayPassword) {
      wx.showModal({
        title: '未设置支付密码',
        content: '请先前往「我的」→「收货地址」页面旁的钱包设置支付密码',
        showCancel: false,
        confirmText: '我知道了',
      });
      this.setData({ showPayKeyboard: false });
      return;
    }

    wx.showLoading({ title: '支付中...' });
    api.walletPayWithPwd({ orderId: pendingOrderId, password })
      .then(() => {
        wx.hideLoading();
        this.setData({ showPayKeyboard: false });
        wx.showToast({ title: '支付成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${pendingOrderId}` });
        }, 800);
      })
      .catch(err => {
        wx.hideLoading();
        // 余额不足时提示去充值
        const msg = (err && err.message) || '支付失败，请重试';
        if (msg.includes('余额不足')) {
          this.setData({ showPayKeyboard: false });
          wx.showModal({
            title: '余额不足',
            content: msg + '\n\n前往钱包充值后再支付',
            confirmText: '去充值',
            cancelText: '稍后再说',
            success: (res) => {
              if (res.confirm) wx.navigateTo({ url: '/pages/wallet/wallet' });
            },
          });
        } else {
          this.selectComponent('#payKeyboard').showError(msg);
        }
      });
  },

  // 支付密码键盘：取消
  onPayCancel() {
    this.setData({ showPayKeyboard: false });
    // 已下单但未支付，跳转订单详情让用户稍后支付
    const { pendingOrderId } = this.data;
    if (pendingOrderId) {
      wx.showModal({
        title: '订单已创建',
        content: '订单已生成但尚未支付，可在「我的订单」中继续支付',
        showCancel: false,
        confirmText: '查看订单',
        success: () => {
          wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${pendingOrderId}` });
        },
      });
    }
  },

  // 忘记支付密码
  onPayForgot() {
    this.setData({ showPayKeyboard: false });
    wx.showToast({ title: '请前往我的→钱包重新设置支付密码', icon: 'none', duration: 3000 });
  },

  _wxPay(payInfo, orderId) {
    wx.requestPayment({
      timeStamp: payInfo.timeStamp, nonceStr: payInfo.nonceStr,
      package: payInfo.package, signType: payInfo.signType || 'RSA', paySign: payInfo.paySign,
      success: () => {
        this.setData({ submitting: false });
        wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
      },
      fail: (err) => {
        this.setData({ submitting: false });
        if (err.errMsg && err.errMsg.includes('cancel')) {
          wx.showToast({ title: '已取消支付', icon: 'none' });
        } else {
          wx.showToast({ title: '支付失败', icon: 'error' });
        }
        wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
      },
    });
  },

  _mockPay(orderId) {
    api.mockPay({ orderId })
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '下单成功', icon: 'success' });
        setTimeout(() => wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` }), 800);
      })
      .catch(() => {
        this.setData({ submitting: false });
        wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
      });
  },
});
