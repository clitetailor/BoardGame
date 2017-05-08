module.exports = {
  navigateFallback: '/index.html',
  stripPrefixMulti: {
    'dist': '/static'
  },
  root: 'dist/',
  staticFileGlobs: [
    'dist/index.html',
    'dist/**.js',
    'dist/**.css'
  ]
};
