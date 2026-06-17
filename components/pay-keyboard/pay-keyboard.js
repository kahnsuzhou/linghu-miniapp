// components/pay-keyboard/pay-keyboard.js
Component({
  properties: {
    show:   { type: Boolean, value: false },
    title:  { type: String,  value: '输入支付密码' },
    amount: { type: String,  value: '' },   // 显示金额，如 "12.00"
  },

  data: {
    input: '',      // 当前输入的密码字符串（最多6位）
    inputLen: 0,
    errorMsg: '',
    keys: ['1','2','3','4','5','6','7','8','9','','0','⌫'],
  },

  observers: {
    show(val) {
      if (val) {
        // 每次打开都重置
        this.setData({ input: '', inputLen: 0, errorMsg: '' });
      }
    },
  },

  methods: {
    _onKeyTap(e) {
      const key = e.currentTarget.dataset.key;
      let { input } = this.data;
      if (key === '⌫') {
        input = input.slice(0, -1);
      } else if (key === '') {
        return; // 空位，不响应
      } else if (input.length < 6) {
        input += key;
      }
      this.setData({ input, inputLen: input.length, errorMsg: '' });

      // 输满6位自动确认
      if (input.length === 6) {
        this._submit(input);
      }
    },

    _submit(pwd) {
      this.triggerEvent('confirm', { password: pwd });
    },

    // 外部调用：标记密码错误并清空输入
    showError(msg) {
      this.setData({ input: '', inputLen: 0, errorMsg: msg || '密码错误，请重试' });
    },

    cancel() {
      this.setData({ input: '', inputLen: 0, errorMsg: '' });
      this.triggerEvent('cancel');
    },

    _onMaskTap() {
      this.cancel();
    },

    _onForgot() {
      this.triggerEvent('forgot');
    },
  },
});
