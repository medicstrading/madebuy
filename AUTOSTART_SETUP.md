# PM2 Autostart Configuration

## ✅ Current Status

Your MadeBuy apps are now running on PM2:
- **Admin**: http://localhost:3301
- **Web**: http://localhost:3302

The PM2 process list has been saved and will be restored after PM2 restarts.

## 🔧 Complete Autostart Setup

To enable PM2 to start automatically on system boot, run this command:

```bash
sudo env PATH=$PATH:/home/aaron/.nvm/versions/node/v20.19.6/bin pm2 startup systemd -u aaron --hp /home/aaron
```

This command will:
1. Create a systemd service for PM2
2. Configure it to start on boot
3. Run PM2 as your user (aaron)

After running the command, you'll see confirmation that the startup script has been installed.

## 🧪 Testing Autostart

To test that autostart works:

1. **Reboot your system**:
   ```bash
   sudo reboot
   ```

2. **After reboot, check PM2 status**:
   ```bash
   pm2 list
   ```

You should see both apps running automatically.

## 📊 PM2 Management Commands

```bash
# View status
pm2 list

# View logs
pm2 logs

# Restart apps
pm2 restart all

# Stop apps
pm2 stop all

# Start apps
pm2 start all

# Remove from PM2
pm2 delete all
```

## 🔄 Updating Apps

When you make changes to the code:

```bash
# Build and restart
pnpm build && pm2 restart all

# Or use the convenience script
pnpm deploy:local
```

## 📝 Notes

- The autostart configuration is already saved in PM2
- You only need to run the `sudo pm2 startup` command once
- If you change the PM2 process list, run `pm2 save` to update it
- The startup script will automatically restore your saved process list on boot
