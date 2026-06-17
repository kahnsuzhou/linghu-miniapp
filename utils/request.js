// utils/request.js —— 统一请求封装
const { BASE_URL } = require('./config')

/**
 * 将 params 对象转为 query string
 */
function toQuery(params) {
  if (!params || typeof params !== 'object') return ''
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return parts.length ? '?' + parts.join('&') : ''
}

/**
 * 发起请求
 * @param {string} url        接口路径（以 / 开头）
 * @param {string} method     GET | POST | PUT | DELETE
 * @param {object} data       请求体 / 查询参数
 * @param {boolean} auth      是否携带 token（默认 true）
 * @returns {Promise<any>}
 */
function request(url, method = 'GET', data = {}, auth = true) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const header = { 'Content-Type': 'application/json' }
    if (auth && app.globalData.token) {
      header['Authorization'] = `Bearer ${app.globalData.token}`
    }

    const fullUrl = BASE_URL + url
    console.log(`[REQ] ${method} ${fullUrl}`)
    wx.request({
      url: fullUrl,
      method,
      data,
      header,
      timeout: 15000,
      success(res) {
        console.log(`[RES] ${method} ${fullUrl} → ${res.statusCode}`, res.statusCode >= 400 ? JSON.stringify(res.data) : '')
        const body = res.data
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          app.globalData.token = null
          app.globalData.userInfo = null
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          reject(new Error('未登录'))
          return
        }
        // 兼容后端：code=200 或 HTTP 200 直接返回 body
        if (body && (body.code === 200 || body.code === 0)) {
          resolve(body.data !== undefined ? body.data : body)
        } else if (res.statusCode >= 200 && res.statusCode < 300 && !body?.code) {
          resolve(body)
        } else {
          const msg = (body && body.msg) ? body.msg : '请求失败'
          wx.showToast({ title: msg, icon: 'none', duration: 2000 })
          reject(new Error(msg))
        }
      },
      fail(err) {
        console.error(`[FAIL] ${method} ${fullUrl}`, err)
        wx.showToast({ title: '网络错误，请检查连接', icon: 'none' })
        reject(err)
      }
    })
  })
}

const api = {
  get:    (url, data, auth)  => request(url, 'GET',    data, auth),
  post:   (url, data, auth)  => request(url, 'POST',   data, auth),
  put:    (url, data, auth)  => request(url, 'PUT',    data, auth),
  delete: (url, data, auth)  => request(url, 'DELETE', data, auth),

  // ── 认证 ────────────────────────────────────────────────────
  wxLogin:     (body)        => request('/api/auth/wx-miniapp', 'POST', body, false),
  currentUser: ()            => request('/api/auth/current-user', 'GET', {}),

  // ── 商品 ────────────────────────────────────────────────────
  nearbyProducts: (lat, lng) => request(`/api/consumer/products/nearby?lat=${lat}&lng=${lng}`, 'GET', {}),
  searchProducts: (keyword)  => request(`/api/consumer/products/search?keyword=${encodeURIComponent(keyword)}`, 'GET', {}),
  productDetail:  (id)       => request(`/api/consumer/product/detail/${id}`, 'GET', {}),
  warehouseMap:   (lat, lng) => request(`/api/consumer/warehouses/map?lat=${lat}&lng=${lng}`, 'GET', {}),

  // ── 订单 ────────────────────────────────────────────────────
  createOrder:  (body)       => request('/api/consumer/order/create', 'POST', body),

  // orderList 支持传 { page, pageSize, status } 对象
  orderList:    (params)     => {
    const query = typeof params === 'object' ? toQuery(params) : (params ? `?status=${params}` : '')
    return request(`/api/consumer/order/list${query}`, 'GET', {})
  },

  orderDetail:  (orderId)    => request(`/api/consumer/order/detail/${orderId}`, 'GET', {}),
  cancelOrder:  (orderId)    => request(`/api/consumer/order/cancel/${orderId}`, 'POST', {}),
  confirmOrder: (orderId)    => request(`/api/consumer/order/confirm/${orderId}`, 'POST', {}),
  pickupCodes:  ()           => request('/api/consumer/order/pickup-codes', 'GET', {}),

  // ── 支付 ────────────────────────────────────────────────────
  walletPay:    (body)       => request('/api/wallet/pay', 'POST', body),
  walletInfo:   ()           => request('/api/wallet/info', 'GET', {}),
  // 模拟支付（测试环境）
  mockPay:      (body)       => request('/api/consumer/order/pay-callback', 'POST',
    { orderId: body.orderId, transactionId: 'mock_' + Date.now(), channel: 'MOCK' }),
}

module.exports = { request, api }
