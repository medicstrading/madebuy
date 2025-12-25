# 🎉 MadeBuy - Local PM2 Deployment Complete!

## ✅ Setup Summary

Your MadeBuy platform is now deployed and running on PM2 with the following configuration:

### 🌐 Access URLs

- **Admin Dashboard**: http://localhost:3301
- **Customer Storefront**: http://localhost:3302

### 📊 Current Status

```
┌────┬──────────────────┬────────┬─────────┬──────────┐
│ id │ name             │ status │ port    │ memory   │
├────┼──────────────────┼────────┼─────────┼──────────┤
│ 0  │ madebuy-admin    │ online │ 3301    │ ~85 MB   │
│ 1  │ madebuy-web      │ online │ 3302    │ ~88 MB   │
└────┴──────────────────┴────────┴─────────┴──────────┘
```

## 🚀 What Was Done

1. ✅ **Found Available Ports**: Selected ports 3301 and 3302 (not in use)
2. ✅ **Updated Configuration**: Modified PM2 config and environment files
3. ✅ **Set Up Environment**: Created `.env.local` files with proper configuration
4. ✅ **Built Project**: Successfully compiled both admin and web apps
5. ✅ **Started PM2**: Launched both applications
6. ✅ **Saved Process List**: PM2 configuration saved for persistence

## 🔧 Complete Autostart (Manual Step Required)

To enable automatic startup on system boot, run this command:

```bash
sudo env PATH=$PATH:/home/aaron/.nvm/versions/node/v20.19.6/bin pm2 startup systemd -u aaron --hp /home/aaron
```

See `AUTOSTART_SETUP.md` for detailed instructions.

## 📝 Key Files Created/Modified

- `ecosystem.config.js` - PM2 configuration (ports 3301, 3302)
- `apps/admin/.env.local` - Admin environment (updated port and secret)
- `apps/web/.env.local` - Web environment (created with defaults)
- `AUTOSTART_SETUP.md` - Instructions for completing autostart
- `README.md` - Full project documentation
- `DEPLOYMENT.md` - Deployment guide

## 🎮 Quick Commands

### Viewing Status
```bash
pm2 list              # View all processes
pm2 logs              # View logs (live tail)
pm2 logs madebuy-admin  # View admin logs only
pm2 logs madebuy-web    # View web logs only
pm2 monit             # Real-time monitoring
```

### Managing Apps
```bash
pm2 restart all       # Restart both apps
pm2 stop all          # Stop both apps
pm2 start all         # Start both apps
pm2 delete all        # Remove from PM2
```

### Updating Code
```bash
pnpm build && pm2 restart all   # Build and restart
pnpm deploy:local              # Convenience script
```

## 🧪 Testing Your Setup

### 1. Test Admin App
```bash
curl http://localhost:3301
# Should return HTML
```

Or visit in browser: http://localhost:3301

### 2. Test Web App
```bash
curl http://localhost:3302
# Should return HTML (404 page expected)
```

Or visit in browser: http://localhost:3302

### 3. Check Logs
```bash
pm2 logs
# Should show both apps running without errors
```

## 🗂️ Log Files

Logs are stored in:
- `logs/admin-error.log` - Admin errors
- `logs/admin-out.log` - Admin output
- `logs/web-error.log` - Web errors
- `logs/web-out.log` - Web output

View logs:
```bash
tail -f logs/admin-out.log
tail -f logs/web-out.log
```

## 📋 Environment Variables

### Currently Configured

**Both Apps:**
- MongoDB: `mongodb://localhost:27017/madebuy`
- Database: `madebuy`

**Admin App:**
- NextAuth URL: `http://localhost:3301`
- NextAuth Secret: Generated and configured

**Web App:**
- Placeholder Stripe keys (replace with real keys for testing payments)
- Email disabled (optional - add Resend API key to enable)

### To Configure Later

Add these to `.env.local` files as needed:

**Admin (`apps/admin/.env.local`):**
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` - For media uploads
- `OPENAI_API_KEY` - For AI caption generation
- `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` - For Instagram integration
- `LATE_API_KEY` - For social media publishing

**Web (`apps/web/.env.local`):**
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` - For payments
- `RESEND_API_KEY` - For order confirmation emails
- `R2_PUBLIC_URL` - For serving uploaded images

## 🎯 Next Steps

1. **Complete Autostart** (optional):
   ```bash
   sudo env PATH=$PATH:/home/aaron/.nvm/versions/node/v20.19.6/bin pm2 startup systemd -u aaron --hp /home/aaron
   ```

2. **Create First Admin User**:
   - You'll need to manually insert a tenant into MongoDB
   - Or implement a signup page

3. **Configure Integrations**:
   - Add real Stripe keys for payment testing
   - Add Resend API key for emails
   - Add R2 credentials for media storage

4. **Test the Platform**:
   - Create pieces in admin
   - Upload media
   - Test checkout flow

## 🔒 Security Notes

- Change the `NEXTAUTH_SECRET` for production
- Never commit `.env.local` files
- Use environment-specific API keys
- Configure MongoDB authentication
- Set up SSL/HTTPS for production

## 📚 Documentation

- `README.md` - Full project documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `AUTOSTART_SETUP.md` - Autostart configuration
- `.env.example` files - Environment variable templates

## 🐛 Troubleshooting

### Apps Not Starting
```bash
pm2 logs                    # Check for errors
pm2 restart all            # Try restarting
pnpm build && pm2 restart all  # Rebuild and restart
```

### Port Already in Use
```bash
lsof -i :3301              # Check what's using the port
kill -9 <PID>              # Kill the process
```

### MongoDB Connection Issues
```bash
mongosh mongodb://localhost:27017/madebuy  # Test connection
```

## ✨ Success Indicators

Your setup is complete and working if:
- ✅ Both apps show "online" status in `pm2 list`
- ✅ Ports 3301 and 3302 are listening
- ✅ Admin app loads at http://localhost:3301
- ✅ Web app loads at http://localhost:3302
- ✅ No errors in `pm2 logs`
- ✅ Memory usage is stable (~85-90 MB each)

## 🎊 All Done!

Your MadeBuy platform is successfully deployed on PM2 and ready for development and testing.

The apps will continue running in the background until you stop them with `pm2 stop all`.

For automatic startup on boot, don't forget to run the autostart command mentioned above!
