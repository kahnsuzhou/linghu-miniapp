# 灵狐近选小程序 · 部署指南

## 一、填入真实 AppID

**文件 1：`utils/config.js`**
```js
const BASE_URL = 'http://124.222.132.208'   // 上线后替换为域名
const WX_APPID = '你的小程序AppID'           // ← 填入
```

**文件 2：`project.config.json`**
```json
{
  "appid": "你的小程序AppID"   // ← 填入
}
```

---

## 二、后端部署（新增微信登录接口）

本地机器执行：

```bash
# 1. 上传新 JAR
scp /workspace/linghu-backend/target/linghu-backend-1.0.0.jar \
    root@124.222.132.208:/opt/linghu/linghu-backend-1.0.0.jar.new

# 2. SSH 登录服务器，切换 JAR 并重启
ssh root@124.222.132.208 << 'EOF'
mv /opt/linghu/linghu-backend-1.0.0.jar.new /opt/linghu/linghu-backend-1.0.0.jar
pkill -f "linghu-backend" || true
sleep 2
nohup java -jar /opt/linghu/linghu-backend-1.0.0.jar \
  --wechat.miniapp.appid=你的AppID \
  --wechat.miniapp.secret=你的AppSecret \
  >> /opt/linghu/app.log 2>&1 & disown
echo "后端已重启，PID=$!"
EOF
```

---

## 三、配置微信小程序后台域名白名单

登录 [微信公众平台](https://mp.weixin.qq.com)：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `http://124.222.132.208` 或 `https://api.linghu.com` |

---

## 四、导入微信开发者工具

1. 打开微信开发者工具
2. 新建项目 → 导入代码
3. 选择 `/workspace/linghu_miniapp` 目录
4. 填入真实 AppID
5. 点击「编译」预览

---

## 五、上线发布

1. 开发者工具 → 上传代码
2. 微信公众平台 → 版本管理 → 提交审核
3. 审核通过后 → 发布上线
