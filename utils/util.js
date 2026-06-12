// utils/util.js —— 通用工具函数
const { BASE_URL } = require('./config')


/**
 * 格式化价格：12.5 → "12.50"
 */
function formatPrice(price) {
  if (price === null || price === undefined) return '0.00'
  return parseFloat(price).toFixed(2)
}

/**
 * 格式化时间：ISO 字符串 → "MM-DD HH:mm"
 */
function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 订单状态 → 中文文本 & 颜色
 */
function orderStatusInfo(status) {
  const map = {
    PENDING_PAYMENT:  { label: '待付款', color: '#FF6B35', desc: '请在30分钟内完成支付' },
    PENDING_PAY:      { label: '待付款', color: '#FF6B35', desc: '请在30分钟内完成支付' },
    PENDING_DELIVERY: { label: '待自提', color: '#1989FA', desc: '请凭自提码到仓库提货' },
    DELIVERING:       { label: '待自提', color: '#1989FA', desc: '请凭自提码到仓库提货' },
    FINISHED:         { label: '已完成', color: '#07C160', desc: '订单已核销完成' },
    CANCELLED:        { label: '已取消', color: '#999',    desc: '订单已取消' },
    REFUNDING:        { label: '退款中', color: '#FF9500', desc: '退款处理中' },
    REFUNDED:         { label: '已退款', color: '#999',    desc: '退款已到账' },
  }
  return map[status] || { label: status || '未知', color: '#999', desc: '' }
}

/**
 * 从商品 images 字段解析第一张图
 * images 可能是 JSON 数组字符串 或 逗号分隔 URL 或 单个 URL
 */
function firstImage(images) {
  if (!images) return ''
  try {
    const arr = JSON.parse(images)
    if (Array.isArray(arr) && arr.length > 0) return toAbsUrl(arr[0])
  } catch (e) {}
  if (images.includes(',')) return toAbsUrl(images.split(',')[0].trim())
  return toAbsUrl(images)
}

/**
 * 解析所有图片为数组
 */
function allImages(images) {
  if (!images) return []
  try {
    const arr = JSON.parse(images)
    if (Array.isArray(arr)) return arr.map(toAbsUrl)
  } catch (e) {}
  if (images.includes(',')) return images.split(',').map(s => toAbsUrl(s.trim()))
  return [toAbsUrl(images)]
}

/**
 * 格式化自提码：6位数字 → "XXX XXX"
 */
function formatPickupCode(code) {
  if (!code) return ''
  const s = String(code)
  if (s.length === 6) return `${s.slice(0, 3)} ${s.slice(3)}`
  return s
}

/**
 * 防抖
 */
function debounce(fn, delay = 500) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 相对路径转绝对 URL
 */
function toAbsUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return BASE_URL + (url.startsWith('/') ? url : '/' + url)
}

module.exports = {
  formatPrice,
  formatTime,
  orderStatusInfo,
  firstImage,
  allImages,
  toAbsUrl,
  formatPickupCode,
  debounce,
}
