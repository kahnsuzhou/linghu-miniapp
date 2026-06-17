// utils/config.js
// 后端 API 地址 —— 上线前替换为正式域名，并在微信公众平台配置合法域名白名单
const BASE_URL = 'https://124.222.132.208'  // HTTPS（解决微信小程序 HTTP 图片限制）

// 微信小程序 AppID（需与 project.config.json 保持一致）
const WX_APPID = 'wxb6997bebf3aa9e11'

module.exports = { BASE_URL, WX_APPID }
