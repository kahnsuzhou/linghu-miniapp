// utils/coupon.js —— 优惠券本地管理（MVP简化版，存 localStorage）
// 正式版应对接后端优惠券接口

const COUPON_KEY = 'user_coupons'
const NEW_USER_COUPON = {
  id: 'new_user_5',
  name: '新用户专享券',
  discount: 5,       // 减5元
  minAmount: 15,     // 满15可用
  type: 'CASH',
  expireAt: null,    // null = 90天后过期（首次领取时计算）
  used: false,
}

/**
 * 新用户首次登录自动发券
 */
function grantNewUserCoupon() {
  const issued = wx.getStorageSync('new_user_coupon_issued')
  if (issued) return
  const coupons = wx.getStorageSync(COUPON_KEY) || []
  const expire = new Date()
  expire.setDate(expire.getDate() + 90)
  coupons.push({
    ...NEW_USER_COUPON,
    expireAt: expire.toISOString(),
  })
  wx.setStorageSync(COUPON_KEY, coupons)
  wx.setStorageSync('new_user_coupon_issued', true)
  wx.showToast({ title: '🎉 已发放5元新用户券', icon: 'none', duration: 2000 })
}

/**
 * 获取我的优惠券列表
 * @returns {Array} 未使用的有效券
 */
function getMyCoupons() {
  const coupons = wx.getStorageSync(COUPON_KEY) || []
  const now = new Date()
  return coupons.filter(c => {
    if (c.used) return false
    if (c.expireAt && new Date(c.expireAt) < now) return false
    return true
  })
}

/**
 * 获取可用于当前订单的优惠券
 * @param {number} orderAmount  订单金额
 */
function getAvailableCoupons(orderAmount) {
  return getMyCoupons().filter(c => orderAmount >= c.minAmount)
}

/**
 * 使用优惠券（标记已用）
 * @param {string} couponId
 */
function useCoupon(couponId) {
  const coupons = wx.getStorageSync(COUPON_KEY) || []
  const idx = coupons.findIndex(c => c.id === couponId)
  if (idx >= 0) {
    coupons[idx].used = true
    wx.setStorageSync(COUPON_KEY, coupons)
  }
}

/**
 * 计算使用优惠券后的实付金额
 */
function calcFinalAmount(originalAmount, coupon) {
  if (!coupon) return originalAmount
  return Math.max(0, originalAmount - coupon.discount)
}

module.exports = {
  grantNewUserCoupon,
  getMyCoupons,
  getAvailableCoupons,
  useCoupon,
  calcFinalAmount,
}
