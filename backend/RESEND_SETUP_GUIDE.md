# 🚀 RESEND EMAIL SERVICE SETUP GUIDE

## 🎯 **WHY RESEND?**

✅ **Cloud-friendly** - Works on all hosting platforms  
✅ **No SMTP blocking** - Uses HTTP API instead of SMTP ports  
✅ **Free tier** - 3,000 emails/month  
✅ **Reliable delivery** - Better than Gmail SMTP on cloud platforms  
✅ **Easy setup** - Just one API key needed  

## 📋 **SETUP STEPS**

### **Step 1: Create Resend Account**
1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address

### **Step 2: Get API Key**
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name: `FitPlanner Production`
4. Permission: `Sending access`
5. Copy the API key (starts with `re_`)

### **Step 3: Add Domain (Optional but Recommended)**
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `fitplanner.com`)
4. Add DNS records as shown
5. Wait for verification

**OR use Resend's shared domain:**
- From: `onboarding@resend.dev`
- No domain setup needed

### **Step 4: Set Environment Variables in Render**

Go to your Render service → Environment tab → Add these:

```bash
# ✅ REQUIRED: Resend API Key
RESEND_API_KEY=re_your_api_key_here

# ✅ REQUIRED: From email address
EMAIL_FROM=FitPlanner <onboarding@resend.dev>

# Optional: Keep Gmail as fallback for development
EMAIL_USER=ahsk321@gmail.com
EMAIL_PASS=sebwfvkykykfkntl
```

### **Step 5: Deploy and Test**

1. **Deploy** your backend to Render
2. **Check logs** for: `✅ Email service initialized with Resend API`
3. **Test forgot password** - should work immediately!

## 🧪 **TESTING**

### **Test Email Service**
```bash
curl -X POST https://your-backend.onrender.com/api/v1/auth/test-email-config \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "connectionValid": true,
    "emailSent": true,
    "environment": "production"
  }
}
```

### **Test Forgot Password**
```bash
curl -X POST https://your-backend.onrender.com/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test@gmail.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, we have sent a password reset link."
}
```

## 📊 **EMAIL SERVICE PRIORITY**

The system tries email services in this order:

1. **🥇 Resend API** (if `RESEND_API_KEY` is set)
2. **🥈 Gmail SMTP** (if `EMAIL_USER` and `EMAIL_PASS` are set)
3. **🥉 Mock/Development** (development mode only)

## 🔍 **TROUBLESHOOTING**

### ❌ **"No email service configured"**
**Solution**: Set `RESEND_API_KEY` in Render environment variables

### ❌ **"Resend API error"**
**Solution**: 
- Check API key is correct (starts with `re_`)
- Verify from email address format
- Check Resend dashboard for error details

### ❌ **"Invalid from address"**
**Solution**: Use one of these formats:
- `onboarding@resend.dev` (shared domain)
- `noreply@yourdomain.com` (your verified domain)
- `FitPlanner <onboarding@resend.dev>` (with name)

## 💰 **PRICING**

### **Resend Free Tier**
- ✅ 3,000 emails/month
- ✅ 100 emails/day
- ✅ All features included

### **Paid Plans** (if you need more)
- Pro: $20/month for 50,000 emails
- Business: $80/month for 100,000 emails

## 🎉 **SUCCESS INDICATORS**

When working correctly, you'll see:

### **Server Logs:**
```
✅ Email service initialized with Resend API (RECOMMENDED)
📧 Attempting to send password reset email to: user@gmail.com
✅ Email sent successfully via Resend API
📧 Email ID: 01234567-89ab-cdef-0123-456789abcdef
```

### **User Experience:**
1. ✅ User requests password reset
2. ✅ Email arrives in inbox (not spam)
3. ✅ Reset link works correctly
4. ✅ Password reset completes successfully

## 🔄 **FALLBACK BEHAVIOR**

If Resend fails, the system will:
1. Log the error
2. Try Gmail SMTP (if configured)
3. Return appropriate error to user

This ensures maximum reliability! 🚀

---

**🎯 RESULT: Forgot password will work reliably on Render with Resend!**