module.exports = {
    apps: [
      {
        name: 'HLS-backend',
        script: 'dist/index.js',
        max_memory_restart: '2G',
        env: {
          node_args: ['--max-old-space-size=2048'], 
          NODE_ENV: 'production'
        },
        restart_delay: 1000
      }
    ]
  };