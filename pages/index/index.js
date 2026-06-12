// pages/index/index.js
const { api } = require('../../utils/request')
const { firstImage, formatPrice } = require('../../utils/util')

Page({
  data: {
    products: [],
    loading: true,
    locGranted: false,
    location: null,
    searchKeyword: '',
    refreshing: false,
  },

  onLoad() {
    this._initLocation()
  },

  onShow() {
    // 若已有位置缓存，直接加载
    const app = getApp()
    if (app.globalData.location && this.data.products.length === 0) {
      this._loadProducts(app.globalData.location)
    }
  },

  _initLocation() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this._getLocation()
        } else {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => this._getLocation(),
            fail: () => {
              // 使用默认位置
              this._loadProducts({ lat: 39.9042, lng: 116.4074 })
              wx.showToast({ title: '未授权位置，显示默认商品', icon: 'none' })
            }
          })
        }
      }
    })
  },

  _getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const loc = { lat: res.latitude, lng: res.longitude }
        this.setData({ location: loc, locGranted: true })
        getApp().globalData.location = loc
        this._loadProducts(loc)
      },
      fail: () => this._loadProducts({ lat: 39.9042, lng: 116.4074 })
    })
  },

  _loadProducts(loc) {
    this.setData({ loading: true })
    api.nearbyProducts(loc.lat, loc.lng).then(data => {
      const products = (data || []).map(p => ({
        ...p,
        thumb: firstImage(p.images),
        priceStr: formatPrice(p.price),
        stockLow: p.stock > 0 && p.stock <= 5,
        stockOut: p.stock <= 0,
      }))
      this.setData({ products, loading: false, refreshing: false })
    }).catch(() => {
      this.setData({ loading: false, refreshing: false })
    })
  },

  onRefresh() {
    this.setData({ refreshing: true })
    const app = getApp()
    this._loadProducts(app.globalData.location || { lat: 39.9042, lng: 116.4074 })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearchConfirm() {
    const kw = this.data.searchKeyword.trim()
    if (!kw) return
    const loc = getApp().globalData.location || { lat: 39.9042, lng: 116.4074 }
    this.setData({ loading: true })
    api.get(`/api/consumer/products/search?keyword=${encodeURIComponent(kw)}&lat=${loc.lat}&lng=${loc.lng}`).then(data => {
      const products = ((data && data.products) || []).map(p => ({
        ...p,
        thumb: firstImage(p.images),
        priceStr: formatPrice(p.price),
        stockLow: p.stock > 0 && p.stock <= 5,
        stockOut: p.stock <= 0,
      }))
      this.setData({ products, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' })
    const loc = getApp().globalData.location || { lat: 39.9042, lng: 116.4074 }
    this._loadProducts(loc)
  },

  onProductTap(e) {
    const { productId, warehouseId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?productId=${productId}&warehouseId=${warehouseId}`
    })
  },

  onPullDownRefresh() {
    this.onRefresh()
    wx.stopPullDownRefresh()
  },
})
