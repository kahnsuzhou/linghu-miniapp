// utils/config.js
// 后端 API 地址 —— 上线前替换为正式域名，并在微信公众平台配置合法域名白名单
const BASE_URL = 'https://api.aifox.club'  // 生产 HTTPS 域名（Let's Encrypt 证书，速度快）

// 微信小程序 AppID（需与 project.config.json 保持一致）
const WX_APPID = 'wxb6997bebf3aa9e11'

module.exports = { BASE_URL, WX_APPID }
