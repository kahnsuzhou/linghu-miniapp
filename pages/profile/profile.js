// pages/profile/profile.js
const couponUtil = require('../../utils/coupon');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    couponCount: 0,

    // 订单快捷入口
    orderTabs: [
      { label: '待付款', status: 'PENDING_PAYMENT', icon: '💳' },
      { label: '待自提', status: 'PENDING_DELIVERY', icon: '🏪' },
      { label: '已完成', status: 'FINISHED', icon: '✅' },
      { label: '已取消', status: 'CANCELLED', icon: '❌' },
    ],
  },

  onShow() {
    const app = getApp();
    const { token, userInfo } = app.globalData;
    const isLoggedIn = !!token;
    const couponCount = isLoggedIn ? couponUtil.getMyCoupons().length : 0;
    this.setData({ userInfo, isLoggedIn, couponCount });
  },

  doLogin() {
    const app = getApp();
    wx.showLoading({ title: '登录中...' });
    // 获取头像和昵称（微信新版需用 button open-type）
    wx.getUserProfile({
      desc: '用于展示您的个人信息',
      success: (profileRes) => {
        const { nickName, avatarUrl } = profileRes.userInfo;
        wx.login({
          success: (loginRes) => {
            app._wxLogin(loginRes.code, nickName, avatarUrl);
            wx.hideLoading();
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '登录失败', icon: 'error' });
          },
        });
      },
      fail: () => {
        // 用户拒绝授权，也尝试静默登录
        wx.login({
          success: (loginRes) => {
            app._wxLogin(loginRes.code, '', '');
            wx.hideLoading();
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '登录失败', icon: 'error' });
          },
        });
      },
    });
  },

  goOrders(e) {
    const { status } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order/order?tab=${status}` });
  },

  goAllOrders() {
    wx.navigateTo({ url: '/pages/order/order' });
  },

  goCoupons() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/coupons/coupons' });
  },

  goAddress() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/address/address' });
  },

  goPayPassword() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/pay-password/pay-password' });
  },

  goAbout() {
    wx.showModal({
      title: '关于灵狐近选',
      content: '灵狐近选 · 30分钟极速自提\n新鲜食材，产地直达，品质保证',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#ff4444',
      success: (res) => {
        if (!res.confirm) return;
        const app = getApp();
        app.globalData.token = '';
        app.globalData.userInfo = null;
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        this.setData({ isLoggedIn: false, userInfo: null });
        wx.showToast({ title: '已退出', icon: 'success' });
      },
    });
  },

  contactService() {
    wx.makePhoneCall({ phoneNumber: '400-000-0000' });
  },
});
