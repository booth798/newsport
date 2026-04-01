module.exports = {
  plugins: {
    autoprefixer: {},
    'postcss-pxtorem': {
      // 375 稿常用基准：37.5px = 1rem。
      // 这样设计稿里的 75px 会被换成 2rem，方便和项目里的 rem 工具函数保持一致。
      rootValue: 37.5,
      propList: ['*'],
      selectorBlackList: ['html', '.norem'],
      minPixelValue: 2,
      mediaQuery: false,
      exclude: /node_modules/i,
    },
  },
};
