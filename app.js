// app.js
const { BASE_URL } = require('./utils/config')

App({
  globalData: {
    userInfo: null,
    token: null,
    location: null,   // { lat, lng }
  },

  onLaunch() {
    // 读取本地缓存的 token
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
    // 获取位置授权
    this._initLocation()
  },

  _initLocation() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this._getLocation()
        }
      }
    })
  },

  _getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.location = { lat: res.latitude, lng: res.longitude }
        // 通知首页刷新
        if (this._locationCallback) this._locationCallback(this.globalData.location)
      },
      fail: () => {
        // 默认北京坐标
        this.globalData.location = { lat: 39.9042, lng: 116.4074 }
      }
    })
  },

  // 登录并获取 token
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code)
          } else {
            reject(new Error('wx.login 失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 检查登录状态，未登录则跳转登录
  requireLogin(callback) {
    if (this.globalData.token) {
      callback && callback()
      return true
    }
    // 触发微信静默登录
    this.login().then(code => {
      return this._wxLogin(code)
    }).then(() => {
      callback && callback()
    }).catch(() => {
      wx.showToast({ title: '请先登录', icon: 'none' })
    })
    return false
  },

  _wxLogin(code, nickName = '微信用户', avatarUrl = '') {
    // 开发者工具模拟器中 wx.login 返回的 code 无法通过微信服务器验证
    // 自动转换为 dev_ 前缀，后端会跳过微信验证直接登录
    const isDev = code && (code.length < 10 || code.startsWith('0') === false)
    const finalCode = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop')
      ? 'dev_' + code
      : code
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/api/auth/wx-miniapp`,
        method: 'POST',
        data: { code: finalCode, nickName, avatarUrl },
        success: (res) => {
          if (res.data.code === 200) {
            const data = res.data.data
            this.globalData.token = data.token
            this.globalData.userInfo = {
              userId: data.userId,
              username: data.username,
              avatar: data.avatar,
              role: data.role
            }
            wx.setStorageSync('token', data.token)
            wx.setStorageSync('userInfo', this.globalData.userInfo)
            resolve(data)
          } else {
            reject(new Error(res.data.msg || '登录失败'))
          }
        },
        fail: reject
      })
    })
  }
})
