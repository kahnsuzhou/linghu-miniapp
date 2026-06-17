// pages/address/address.js
const { api } = require('../../utils/request')

Page({
  data: {
    addresses: [],
    loading: true,
    // 是否是从结算页跳来选择地址的
    selectMode: false,
  },

  onLoad(options) {
    this.setData({ selectMode: options.select === '1' })
  },

  onShow() {
    this._loadAddresses()
  },

  _loadAddresses() {
    this.setData({ loading: true })
    api.addressList()
      .then(list => {
        this.setData({ addresses: list || [], loading: false })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'error' })
      })
  },

  // 选中地址（结算页跳来时）
  selectAddress(e) {
    if (!this.data.selectMode) return
    const { id } = e.currentTarget.dataset
    const addr = this.data.addresses.find(a => a.id === id)
    if (!addr) return
    // 把选中地址存到 globalData，结算页取用
    getApp().globalData.selectedAddress = addr
    wx.navigateBack()
  },

  // 新增地址
  addAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  // 编辑地址
  editAddress(e) {
    e.stopPropagation && e.stopPropagation()
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${id}` })
  },

  // 设为默认
  setDefault(e) {
    e.stopPropagation && e.stopPropagation()
    const { id } = e.currentTarget.dataset
    wx.showLoading({ title: '设置中...' })
    api.addressSetDef(id)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已设为默认', icon: 'success' })
        this._loadAddresses()
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '操作失败', icon: 'error' })
      })
  },

  // 删除地址
  deleteAddress(e) {
    e.stopPropagation && e.stopPropagation()
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除地址',
      content: '确定删除该地址吗？',
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        api.addressDel(id)
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            this._loadAddresses()
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'error' })
          })
      }
    })
  },
})
