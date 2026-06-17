// pages/address-edit/address-edit.js
const { api } = require('../../utils/request')

Page({
  data: {
    isEdit: false,
    addressId: null,
    form: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
    },
    saving: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, addressId: options.id })
      wx.setNavigationBarTitle({ title: '编辑地址' })
      this._loadAddress(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' })
    }
  },

  _loadAddress(id) {
    api.addressList().then(list => {
      const addr = (list || []).find(a => String(a.id) === String(id))
      if (addr) {
        this.setData({
          form: {
            name: addr.name || '',
            phone: addr.phone || '',
            province: addr.province || '',
            city: addr.city || '',
            district: addr.district || '',
            detail: addr.detail || '',
          }
        })
      }
    })
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  // 使用微信选择地区
  chooseRegion() {
    wx.chooseLocation({
      success: (res) => {
        // 解析地址（微信返回的 address 如 "北京市朝阳区望京街道..."）
        const addr = res.address || ''
        // 简单解析省市区
        const parts = addr.match(/^(.+?省|.+?市)(.+?市|.+?区|.+?县)?(.+?区|.+?县|.+?镇)?/)
        this.setData({
          'form.province': (parts && parts[1]) || '',
          'form.city': (parts && parts[2]) || '',
          'form.district': (parts && parts[3]) || '',
          'form.detail': res.name || '',
        })
      },
      fail: () => {
        wx.showToast({ title: '未能获取位置', icon: 'none' })
      }
    })
  },

  save() {
    const { form, isEdit, addressId, saving } = this.data
    if (saving) return

    if (!form.name.trim()) { wx.showToast({ title: '请填写联系人', icon: 'none' }); return }
    if (!form.phone.trim()) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return }
    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) { wx.showToast({ title: '手机号格式不正确', icon: 'none' }); return }
    if (!form.detail.trim()) { wx.showToast({ title: '请填写详细地址', icon: 'none' }); return }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })

    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detail: form.detail.trim(),
    }

    const req = isEdit
      ? api.addressUpdate(addressId, body)
      : api.addressAdd(body)

    req.then(() => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    }).catch(() => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: '保存失败，请重试', icon: 'error' })
    })
  },
})
