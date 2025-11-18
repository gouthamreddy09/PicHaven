# Configure Password Reset in Supabase

## ✅ What I've Fixed

I've implemented a proper password reset flow:

1. **Created ResetPasswordForm component** - Users can enter a new password
2. **Updated App.tsx** - Detects password reset link and shows reset form
3. **Fixed AuthContext** - Reset link redirects to app homepage
4. **Added validation** - Password must match and be 6+ characters

## 🔧 Required Supabase Configuration

You need to configure the email template in Supabase to prevent auto-login.

### Step 1: Go to Supabase Email Templates

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **psviobxdhartubydyrhb**
3. Go to **Authentication** → **Email Templates**
4. Find **"Reset Password"** or **"Confirm Password Recovery"** template

### Step 2: Update the Email Template

Replace the existing template with this:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .content p {
      color: #4b5563;
      font-size: 16px;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .info-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .info-box p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0;
    }
    .security-notice {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .security-notice p {
      color: #991b1b;
      font-size: 14px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 PicHaven</h1>
    </div>

    <div class="content">
      <h2>Reset Your Password</h2>

      <p>Hello!</p>

      <p>We received a request to reset your password for your PicHaven account. Click the button below to create a new password:</p>

      <div class="button-container">
        <a href="{{ .ConfirmationURL }}" class="button">
          Reset Password
        </a>
      </div>

      <div class="info-box">
        <p><strong>⏱️ Important:</strong> This link expires in 1 hour for security reasons.</p>
      </div>

      <p>After clicking the button, you'll be taken to a secure page where you can enter your new password.</p>

      <div class="security-notice">
        <p><strong>🛡️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
      </p>
    </div>

    <div class="footer">
      <p><strong>PicHaven</strong></p>
      <p>Your Photos, Organized and Secure in the Cloud</p>
      <p style="margin-top: 20px;">Questions? Contact us at support@pichaven.com</p>
    </div>
  </div>
</body>
</html>
```

### Step 3: Save the Template

Click **Save** in Supabase dashboard.

## 🎯 How It Works Now

### Old Behavior (Problem):
1. User clicks "Forgot Password"
2. Receives email with link
3. Clicks link → **Automatically logged in** ❌
4. No way to change password

### New Behavior (Fixed):
1. User clicks "Forgot Password"
2. Receives email with link
3. Clicks link → **Opens password reset form** ✅
4. User enters new password
5. Password updated → Redirected to login ✅

## 🔍 Testing the Flow

### Test Locally:

1. Start your development server:
```bash
npm run dev
```

2. Click "Forgot Password" on login page

3. Enter your email address

4. Check your email inbox

5. Click the reset link in the email

6. You should see the **Reset Password** form (not auto-login)

7. Enter new password and confirm

8. Click "Reset Password"

9. Should show success message and redirect to login

### Test in Production:

Same steps as above, but on your deployed Netlify URL.

## 📧 Email Template Variables

The Supabase email template supports these variables:

- `{{ .ConfirmationURL }}` - The password reset link
- `{{ .Token }}` - The recovery token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your site URL from Supabase config

## ⚙️ Additional Supabase Settings

### Check Site URL Configuration:

1. Go to **Authentication** → **URL Configuration**
2. Verify **Site URL** is set to your production URL:
   - Development: `http://localhost:5173`
   - Production: `https://your-app.netlify.app`

### Check Redirect URLs:

1. Go to **Authentication** → **URL Configuration**
2. Add your URLs to **Redirect URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/**
   https://your-app.netlify.app
   https://your-app.netlify.app/**
   ```

## 🎨 What the User Sees

### Step 1: Forgot Password Page
- Clean form with email input
- "Send Reset Link" button
- Success message after submission

### Step 2: Email Inbox
- Professional email from PicHaven
- Clear "Reset Password" button
- Security notice
- 1-hour expiration warning

### Step 3: Reset Password Page
- New password input
- Confirm password input
- Password requirements shown
- "Reset Password" button

### Step 4: Success Message
- Green checkmark icon
- "Password Reset Successful" message
- Auto-redirect to login in 2 seconds

## 🔒 Security Features

1. **Token Expiration:** Links expire after 1 hour
2. **Password Validation:**
   - Minimum 6 characters
   - Must match confirmation
3. **Session Handling:** Old sessions invalidated after reset
4. **Secure Storage:** Passwords hashed with bcrypt
5. **HTTPS Only:** All communication encrypted

## 🐛 Troubleshooting

### Problem: Still auto-logging in

**Solution:**
1. Clear browser cache and cookies
2. Verify Supabase email template saved correctly
3. Check that `redirectTo` in AuthContext is set to homepage
4. Test in incognito/private browsing mode

### Problem: Email not received

**Solution:**
1. Check spam/junk folder
2. Verify email in Supabase Auth Users list
3. Check Supabase logs for email sending errors
4. Verify SMTP settings in Supabase (for custom domain emails)

### Problem: Reset link returns error

**Solution:**
1. Link may have expired (1 hour limit)
2. Link can only be used once
3. Check browser console for errors
4. Verify Supabase project is active

### Problem: "Invalid refresh token" error

**Solution:**
1. This is expected - link has been used or expired
2. Request a new password reset link
3. Use the link immediately after receiving

## 📝 Code Changes Made

### 1. Created `ResetPasswordForm.tsx`
- New component for password reset
- Validates password length and match
- Shows success state
- Auto-redirects after success

### 2. Updated `App.tsx`
- Detects `#type=recovery` in URL hash
- Shows ResetPasswordForm when detected
- Prevents auto-login during reset

### 3. Updated `AuthContext.tsx`
- Changed `redirectTo` to homepage
- Supabase handles recovery flow

### 4. Email Template
- Professional design
- Clear call-to-action
- Security notices
- Expiration warning

## ✅ Final Checklist

Before deploying:

- [ ] Supabase email template updated
- [ ] Site URL configured in Supabase
- [ ] Redirect URLs added to Supabase
- [ ] Tested locally with real email
- [ ] Build succeeds (`npm run build`)
- [ ] Deployed to Netlify
- [ ] Tested on production URL
- [ ] Email arrives in inbox
- [ ] Reset form appears (no auto-login)
- [ ] Password successfully updated

## 🎉 Success Criteria

Your password reset is working correctly when:

1. ✅ User receives professional email
2. ✅ Click link opens reset form (NOT auto-login)
3. ✅ User can enter new password
4. ✅ Password validation works
5. ✅ Success message appears
6. ✅ User can login with new password
7. ✅ Old password no longer works

---

**Need Help?**

If you encounter issues:
1. Check Supabase logs in dashboard
2. Check browser console for errors
3. Verify all configuration steps
4. Test with a fresh incognito window

Your password reset flow is now secure and user-friendly! 🔐✨