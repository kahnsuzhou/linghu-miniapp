// pages/detail/detail.js
const { api } = require('../../utils/request');
const { formatPrice, firstImage, allImages } = require('../../utils/util');

Page({
  data: {
    productId: null,
    product: null,
    loading: true,
    currentImgIndex: 0,
    quantity: 1,
    stockLeft: 0,
  },

  onLoad(options) {
    const id = options.id || options.productId  // 兼容两种传参
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.setData({ productId: id, warehouseId: options.warehouseId || null });
    this._loadDetail(id);
  },

  _loadDetail(id) {
    if (!id || id === 'undefined') {
      wx.showToast({ title: '商品不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.setData({ loading: true });
    api.productDetail(id)
      .then(res => {
        const p = res.data || res;
        const images = allImages(p.images || p.imageList);
        const stockLeft = p.stock != null ? p.stock : 99;
        this.setData({
          product: {
            ...p,
            id: p.id || p.productId,  // 统一字段名
            imageList: images,
            priceStr: formatPrice(p.price),
            originalPriceStr: p.originalPrice ? formatPrice(p.originalPrice) : null,
            stockLeft,
            stockLow: stockLeft > 0 && stockLeft <= 5,
            soldOut: stockLeft <= 0,
            warehouseName: p.warehouseName || p.warehouse?.name || '附近仓库',
            distanceStr: p.distance != null ? (p.distance >= 1000 ? (p.distance / 1000).toFixed(1) + 'km' : p.distance + 'm') : '',
          },
          stockLeft,
          loading: false,
        });
        wx.setNavigationBarTitle({ title: p.name || '商品详情' });
      })
      .catch(err => {
        console.error('加载详情失败', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败，请重试', icon: 'error' });
      });
  },

  onImgChange(e) {
    this.setData({ currentImgIndex: e.detail.current });
  },

  previewImg(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.product?.imageList || [];
    wx.previewImage({
      current: images[index],
      urls: images,
    });
  },

  changeQty(e) {
    const { action } = e.currentTarget.dataset;
    let qty = this.data.quantity;
    const maxQty = Math.min(this.data.stockLeft, 99);
    if (action === 'plus' && qty < maxQty) qty++;
    if (action === 'minus' && qty > 1) qty--;
    this.setData({ quantity: qty });
  },

  buyNow() {
    const app = getApp();
    if (!app.globalData.token) {
      app.requireLogin(() => this.buyNow());
      return;
    }
    if (!this.data.product) return;
    if (this.data.product.soldOut) {
      wx.showToast({ title: '商品已售罄', icon: 'none' });
      return;
    }
    const { product, quantity, warehouseId } = this.data;
    const pid = product.id || product.productId;
    const wid = warehouseId || product.warehouseId || 1;  // 透传仓库ID
    wx.navigateTo({
      url: `/pages/checkout/checkout?productId=${pid}&quantity=${quantity}&warehouseId=${wid}`,
    });
  },

  onShareAppMessage() {
    const p = this.data.product;
    return {
      title: p ? p.name : '好物推荐',
      path: `/pages/detail/detail?id=${this.data.productId}`,
      imageUrl: p ? (p.imageList[0] || '') : '',
    };
  },
});
