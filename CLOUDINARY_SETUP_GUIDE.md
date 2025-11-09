# Cloudinary Setup Guide - Step by Step

## Why Cloudinary?
- ✅ **Free tier**: 25GB storage + 25GB bandwidth/month
- ✅ **No credit card required** to start
- ✅ **Easiest setup**: 5 minutes
- ✅ **Auto-optimization**: Videos/images automatically optimized
- ✅ **Built-in CDN**: Fast delivery worldwide

---

## Step 1: Create Account (2 minutes)

1. Go to: https://cloudinary.com/users/register_free
2. Sign up with email (or Google/GitHub)
3. Verify your email
4. You'll be taken to the Dashboard

---

## Step 2: Get Your Credentials (1 minute)

On the Cloudinary Dashboard, you'll see:

```
Cloud name: democloud123
API Key: 123456789012345
API Secret: AbCdEfGhIjKlMnOpQrStUvWx
```

**Copy these 3 values** - you'll need them in the next step.

---

## Step 3: Add Credentials to .env File (2 minutes)

1. **Open** your project in VS Code/Cursor
2. **Navigate to** `app/.env` file
3. **Add these lines** (replace with YOUR values from Cloudinary dashboard):

```bash
# Cloud Storage - Cloudinary
STORAGE_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="democloud123"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="AbCdEfGhIjKlMnOpQrStUvWx"
# Fallback clip if camera stream recording unavailable
DEFAULT_CLIP_SOURCE="https://res.cloudinary.com/demo/video/upload/dog.mp4"
```

4. **Save** the file

**⚠️ Security Note:** Never commit `.env` to git! It's already in `.gitignore`.

---

## Step 4: Install Cloudinary SDK (30 seconds)

Open terminal and run:

```bash
cd /Users/luizcarneiro/nexxau/app
npm install cloudinary
```

This downloads the Cloudinary "toolbox" so your app can upload files.

---

## Step 5: Test It (Optional)

After installing, restart your dev server:

```bash
npm run dev
```

Then test by saving a training image or creating an alert with video.

---

## ✅ That's It!

Your app is now configured to:
- ✅ Upload video clips to Cloudinary when alerts are created
- ✅ Save training images to Cloudinary
- ✅ Auto-optimize videos/images
- ✅ Serve them via global CDN

---

## 📊 Free Tier Limits

- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Video**: Up to 1GB per video

For this project, free tier should be fine for development and small deployments. When you grow, paid plans start at $89/month.

---

## 🔄 Alternative: AWS S3 (For Later)

If you prefer AWS S3 (more scalable, pay-as-you-go):

1. Create AWS account
2. Go to S3 console
3. Create buckets: `nexxau-ai-training` and `nexxau-video-clips`
4. Create IAM access key
5. Add to `.env`:

```bash
STORAGE_PROVIDER="aws-s3"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_TRAINING="nexxau-ai-training"
AWS_S3_BUCKET_VIDEOS="nexxau-video-clips"
```

6. Install: `npm install @aws-sdk/client-s3`

**Cost:** ~$0.023/GB storage + $0.09/GB transfer = ~$10-15/month

---

## 🆘 Need Help?

If you get stuck:
1. Make sure `.env` file is in the `app/` folder
2. Restart dev server after adding env vars
3. Check console for any error messages
4. Verify credentials are correct (copy-paste from Cloudinary dashboard)

