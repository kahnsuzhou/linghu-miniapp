// pages/pay-password/pay-password.js
const { api } = require('../../utils/request');

Page({
  data: {
    hasPassword: false,
    step: 'input',   // 'input' | 'confirm'
    pwd1: '',
    pwd2: '',
    errorMsg: '',
    keys: ['1','2','3','4','5','6','7','8','9','','0','⌫'],
  },

  onLoad() {
    api.walletInfo().then(info => {
      this.setData({ hasPassword: info.hasPayPassword || false });
    }).catch(() => {});
  },

  onKeyTap(e) {
    const key = e.currentTarget.dataset.key;
    const { step, pwd1, pwd2 } = this.data;

    if (step === 'input') {
      let val = pwd1;
      if (key === '⌫') val = val.slice(0, -1);
      else if (key === '') return;
      else if (val.length < 6) val += key;
      this.setData({ pwd1: val, errorMsg: '' });
      if (val.length === 6) {
        // 进入确认步骤
        setTimeout(() => this.setData({ step: 'confirm' }), 150);
      }
    } else {
      let val = pwd2;
      if (key === '⌫') {
        val = val.slice(0, -1);
        this.setData({ pwd2: val, errorMsg: '' });
      } else if (key === '') {
        return;
      } else if (val.length < 6) {
        val += key;
        this.setData({ pwd2: val, errorMsg: '' });
        if (val.length === 6) this._submit(val);
      }
    }
  },

  _submit(pwd2) {
    const { pwd1 } = this.data;
    if (pwd1 !== pwd2) {
      this.setData({ pwd2: '', errorMsg: '两次密码不一致，请重新输入' });
      return;
    }
    wx.showLoading({ title: '设置中...' });
    api.walletSetPassword(pwd1)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '支付密码设置成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ pwd2: '', errorMsg: (err && err.message) || '设置失败，请重试' });
      });
  },
});
