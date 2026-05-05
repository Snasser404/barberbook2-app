// PM2 process manager config
// Start all:  pm2 start ecosystem.config.cjs
// Status:     pm2 status
// Logs:       pm2 logs
// Stop all:   pm2 stop ecosystem.config.cjs
// Restart:    pm2 restart all
// Save state: pm2 save
module.exports = {
  apps: [
    {
      name: 'barbershop-server',
      cwd: './server',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'watch src/index.ts',
      env: { NODE_ENV: 'development' },
      max_memory_restart: '500M',
      autorestart: true,
    },
    {
      name: 'barbershop-client',
      cwd: './client',
      script: 'node_modules/vite/bin/vite.js',
      args: '',
      env: { NODE_ENV: 'development' },
      max_memory_restart: '500M',
      autorestart: true,
    },
    {
      name: 'barbershop-ngrok',
      script: 'C:/Users/Nasser Abdulqawi/AppData/Local/Microsoft/WinGet/Links/ngrok.exe',
      args: 'http 5173 --log=stdout',
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
