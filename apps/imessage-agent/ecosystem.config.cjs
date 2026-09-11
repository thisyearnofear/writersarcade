module.exports = {
  apps: [
    {
      name: 'flynn-imessage',
      script: 'node_modules/.bin/tsx',
      args: 'src/cloud.ts',
      interpreter: 'none',
      env_file: '.env',
      max_memory_restart: '300M',
      autorestart: true,
      restart_delay: 5000,
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
      time: true,
    },
  ],
}
