module.exports = {
  plugins: ['@babel/plugin-proposal-optional-chaining'],
  presets: [
    ['@babel/preset-env', {modules: 'auto', targets: {"esmodules": true, node: 'current'}}],
    ['@babel/preset-typescript'],
  ],
};