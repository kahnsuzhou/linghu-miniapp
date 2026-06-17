// pages/wallet/wallet.js
const { api } = require('../../utils/request');

const QUICK_AMOUNTS = [10, 30, 50, 100, 200, 500];

Page({
  data: {
    balance: '0.00',
    frozen: '0.00',
    hasPayPassword: false,

    // 充值面板
    showRecharge: false,
    quickAmounts: QUICK_AMOUNTS,
    selectedAmount: 50,   // 默认选中50元
    customAmount: '',
    finalAmount: '50.00',
    recharging: false,

    // 流水
    txList: [],
    loadingTx: true,
    loadingMore: false,
    hasMore: false,
    page: 1,
    pageSize: 15,
  },

  onLoad() {
    this._loadWallet();
    this._loadTx(1);
  },

  onShow() {
    // 从设置密码页返回时刷新
    this._loadWallet();
  },

  _loadWallet() {
    api.walletInfo().then(info => {
      this.setData({
        balance: Number(info.available ?? info.balance ?? 0).toFixed(2),
        frozen:  Number(info.frozen ?? 0).toFixed(2),
        hasPayPassword: info.hasPayPassword || false,
      });
    }).catch(() => {});
  },

  _loadTx(page) {
    const isFirst = page === 1;
    this.setData(isFirst ? { loadingTx: true } : { loadingMore: true });

    api.get('/api/wallet/transactions', { page, size: this.data.pageSize })
      .then(res => {
        const data = res.data || res;
        const list = data.list || [];
        const total = data.total || 0;

        // 格式化时间
        const formatted = list.map(tx => ({
          ...tx,
          amount: Number(tx.amount).toFixed(2),
          balanceAfter: Number(tx.balanceAfter).toFixed(2),
          createTime: this._fmtTime(tx.createTime),
        }));

        const newList = isFirst ? formatted : [...this.data.txList, ...formatted];
        this.setData({
          txList: newList,
          loadingTx: false,
          loadingMore: false,
          page,
          hasMore: newList.length < total,
        });
      })
      .catch(() => {
        this.setData({ loadingTx: false, loadingMore: false });
      });
  },

  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this._loadTx(this.data.page + 1);
  },

  _fmtTime(str) {
    if (!str) return '';
    return String(str).replace('T', ' ').slice(0, 16);
  },

  // ── 充值面板 ────────────────────────
  openRecharge() {
    this.setData({ showRecharge: true });
  },
  closeRecharge() {
    this.setData({ showRecharge: false });
  },

  selectAmount(e) {
    const val = e.currentTarget.dataset.val;
    this.setData({
      selectedAmount: val,
      customAmount: '',
      finalAmount: Number(val).toFixed(2),
    });
  },

  onCustomInput(e) {
    const v = e.detail.value;
    this.setData({
      customAmount: v,
      selectedAmount: null,
      finalAmount: v ? Number(v).toFixed(2) : '0.00',
    });
  },

  doRecharge() {
    const { selectedAmount, customAmount, recharging } = this.data;
    if (recharging) return;

    const raw = customAmount || selectedAmount;
    const amount = parseFloat(raw);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请选择或输入充值金额', icon: 'none' }); return;
    }
    if (amount > 10000) {
      wx.showToast({ title: '单次最多充值 ¥10000', icon: 'none' }); return;
    }

    this.setData({ recharging: true });
    wx.showLoading({ title: '充值中...' });

    api.post('/api/wallet/recharge', { amount })
      .then(res => {
        wx.hideLoading();
        this.setData({ recharging: false, showRecharge: false });
        const after = Number((res.data || res).balanceAfter ?? (res.balanceAfter)).toFixed(2);
        wx.showToast({ title: `充值成功！余额 ¥${after}`, icon: 'success', duration: 2500 });
        this._loadWallet();
        this._loadTx(1);
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ recharging: false });
        wx.showToast({ title: (err && err.message) || '充值失败，请重试', icon: 'none' });
      });
  },

  // ── 跳转 ────────────────────────────
  goSetPassword() {
    wx.navigateTo({ url: '/pages/pay-password/pay-password' });
  },
});
