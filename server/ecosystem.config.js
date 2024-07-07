module.exports = {
    apps: [
      {
        name: 'HLS-backend',
        script: 'dist/index.js',
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'production'
        }
      }
    ]
  };