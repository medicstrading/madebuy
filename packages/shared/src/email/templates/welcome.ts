/**
 * Welcome Email Template
 *
 * Sent to new tenants when they complete signup
 */

import type { Tenant } from '../../types/tenant'

export interface WelcomeEmailData {
  tenant: Tenant
  adminUrl: string
  marketplaceUrl: string
}

// Common styles for all emails
const STYLES = {
  container:
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;',
  header:
    'background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 24px;',
  body: 'background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;',
  button:
    'display: inline-block; background: #16a34a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 8px;',
  infoBox:
    'background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #16a34a;',
  stepBox:
    'background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;',
  footer: 'text-align: center; color: #999; font-size: 12px; margin-top: 20px;',
}

/**
 * Render welcome email
 */
export function renderWelcomeEmail(data: WelcomeEmailData): {
  subject: string
  html: string
  text: string
} {
  const { tenant, adminUrl, marketplaceUrl } = data

  const subject = "Welcome to MadeBuy - Let's Get You Started!"

  const storefrontUrl = `${marketplaceUrl}/${tenant.slug}`
  const dashboardUrl = adminUrl

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="${STYLES.header}">
    <h1 style="${STYLES.headerTitle}">Welcome to MadeBuy!</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${tenant.businessName || 'there'},</p>

    <p>Welcome to MadeBuy - the Australian marketplace that puts makers first! We're thrilled to have you join our community of talented creators.</p>

    <div style="${STYLES.infoBox}">
      <p style="margin: 0 0 8px 0; color: #166534; font-weight: 600;">
        Your shop is ready!
      </p>
      <p style="margin: 0; color: #166534; font-size: 14px;">
        Your unique storefront: <strong>${tenant.slug}.madebuy.com.au</strong>
      </p>
    </div>

    <h3 style="margin: 24px 0 12px 0; color: #166534;">Quick Start Guide</h3>

    <div style="${STYLES.stepBox}">
      <div style="display: flex; align-items: start;">
        <div style="background: #16a34a; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; margin-right: 12px;">1</div>
        <div>
          <strong>Complete Your Profile</strong>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
            Add your business details, logo, and brand colors to make your shop stand out.
          </p>
        </div>
      </div>
    </div>

    <div style="${STYLES.stepBox}">
      <div style="display: flex; align-items: start;">
        <div style="background: #16a34a; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; margin-right: 12px;">2</div>
        <div>
          <strong>Add Your First Product</strong>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
            Upload photos, set prices, and write compelling descriptions that showcase your craftsmanship.
          </p>
        </div>
      </div>
    </div>

    <div style="${STYLES.stepBox}">
      <div style="display: flex; align-items: start;">
        <div style="background: #16a34a; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; margin-right: 12px;">3</div>
        <div>
          <strong>Set Up Shipping</strong>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
            Configure your shipping methods and rates. We integrate with Sendle for easy label printing!
          </p>
        </div>
      </div>
    </div>

    <div style="${STYLES.stepBox}">
      <div style="display: flex; align-items: start;">
        <div style="background: #16a34a; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; margin-right: 12px;">4</div>
        <div>
          <strong>Connect Stripe for Payments</strong>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
            Set up secure payments to start accepting orders. MadeBuy charges ZERO platform fees!
          </p>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="${STYLES.button}">Go to Dashboard</a>
      <a href="${storefrontUrl}" style="${STYLES.button}; background: #7c3aed;">View Your Shop</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <h3 style="margin: 24px 0 12px 0;">Why MadeBuy?</h3>
    <ul style="color: #666; font-size: 14px; line-height: 1.8;">
      <li><strong>Zero Transaction Fees:</strong> Keep 100% of your earnings (minus payment processing)</li>
      <li><strong>Beautiful Storefronts:</strong> Customizable shops that reflect your brand</li>
      <li><strong>Social Publishing:</strong> Schedule posts to Instagram and Facebook from your dashboard</li>
      <li><strong>Made in Australia:</strong> Supporting local makers and celebrating Australian craftsmanship</li>
    </ul>

    <div style="${STYLES.infoBox}; margin-top: 24px;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        <strong>Need help?</strong> Reply to this email or check out our documentation. We're here to help you succeed!
      </p>
    </div>

    <p style="margin-top: 24px;">Happy selling!</p>
    <p style="margin: 4px 0;">The MadeBuy Team</p>
  </div>

  <p style="${STYLES.footer}">
    MadeBuy - Supporting Australian makers, zero platform fees<br>
    madebuy.com.au
  </p>
</body>
</html>
  `.trim()

  const text = `
Welcome to MadeBuy!

Hi ${tenant.businessName || 'there'},

Welcome to MadeBuy - the Australian marketplace that puts makers first! We're thrilled to have you join our community of talented creators.

YOUR SHOP IS READY!
Your unique storefront: ${tenant.slug}.madebuy.com.au

QUICK START GUIDE

1. Complete Your Profile
   Add your business details, logo, and brand colors to make your shop stand out.

2. Add Your First Product
   Upload photos, set prices, and write compelling descriptions that showcase your craftsmanship.

3. Set Up Shipping
   Configure your shipping methods and rates. We integrate with Sendle for easy label printing!

4. Connect Stripe for Payments
   Set up secure payments to start accepting orders. MadeBuy charges ZERO platform fees!

Go to Dashboard: ${dashboardUrl}
View Your Shop: ${storefrontUrl}

WHY MADEBUY?

- Zero Transaction Fees: Keep 100% of your earnings (minus payment processing)
- Beautiful Storefronts: Customizable shops that reflect your brand
- Social Publishing: Schedule posts to Instagram and Facebook from your dashboard
- Made in Australia: Supporting local makers and celebrating Australian craftsmanship

NEED HELP?
Reply to this email or check out our documentation. We're here to help you succeed!

Happy selling!
The MadeBuy Team

---
MadeBuy - Supporting Australian makers, zero platform fees
madebuy.com.au
  `.trim()

  return { subject, html, text }
}
