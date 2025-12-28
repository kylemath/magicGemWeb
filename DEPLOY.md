# Deploying Magic Gems to Netlify

This guide will help you deploy the Magic Gems web application to Netlify.

## Prerequisites

- A [GitHub](https://github.com) account
- A [Netlify](https://netlify.com) account (free tier works great!)
- Git installed on your computer

## Deployment Steps

### Step 1: Push to GitHub

1. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Name it something like `magic-gems-web`
   - Keep it public (or private if you prefer)
   - Don't initialize with README (we already have files)
   - Click "Create repository"

2. **Push your code** (if not already done):
   ```bash
   cd /Users/kylemathewson/Coding/MAGICGEMS/magicGemWeb
   git init
   git add .
   git commit -m "Initial commit: Magic Gems web app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/magic-gems-web.git
   git push -u origin main
   ```

### Step 2: Deploy to Netlify

1. **Log in to Netlify**:
   - Go to https://app.netlify.com
   - Sign up or log in (you can use your GitHub account)

2. **Import your project**:
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your GitHub account
   - Select your `magic-gems-web` repository

3. **Configure build settings**:
   - **Site name**: Choose a custom name (e.g., `magic-gems-mathewson`) or use auto-generated
   - **Branch to deploy**: `main`
   - **Build command**: (leave empty)
   - **Publish directory**: `.` (or leave empty)
   - Click "Deploy site"

4. **Wait for deployment** (usually takes 30-60 seconds)

5. **Your site is live!** 🎉
   - URL will be: `https://YOUR-SITE-NAME.netlify.app`
   - You can customize this in Site settings → Domain management

### Step 3: Custom Domain (Optional)

If you have a custom domain:

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow the instructions to update your DNS settings
4. Netlify will automatically provision SSL certificates

## Automatic Deployments

Once connected, any push to your `main` branch will automatically trigger a new deployment!

```bash
# Make changes to your code
git add .
git commit -m "Update visualizations"
git push

# Netlify automatically deploys! ✨
```

## Configuration Files

The repository includes:

- **`netlify.toml`**: Netlify configuration with redirects and headers
- **`.netlifyignore`**: Excludes Python backend and dev files from deployment

## Troubleshooting

### Issue: Site doesn't load properly
- Check the Netlify deploy logs for errors
- Ensure all file paths are relative (no absolute paths)
- Verify that `data/` folder is committed to git

### Issue: 404 errors on navigation
- The `netlify.toml` redirects should handle this
- Make sure the file was committed and deployed

### Issue: Missing files
- Check `.netlifyignore` - make sure needed files aren't excluded
- Verify files are committed to git: `git ls-files`

## Local Development

To test locally:

```bash
# Option 1: Simple Python server
python3 -m http.server 8000

# Option 2: Custom Python server with API (optional)
python3 server.py

# Then open http://localhost:8000
```

## Features

Your deployed site includes:
- ✨ Interactive 3D Magic Gem visualizations
- 📊 Energy landscape analysis
- 🔢 4×4 Magic Square gallery
- 📄 Paper craft template generator
- 🎨 Interactive builder

All running completely client-side with no backend required!

## Support

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Community**: https://answers.netlify.com
- **Build Logs**: Check your Netlify dashboard for detailed deployment logs

---

**Pro Tips:**
- Enable "Deploy previews" for pull requests in Netlify settings
- Set up branch deploys for testing (e.g., `develop` branch)
- Use Netlify Analytics to track visitors (paid feature)
- Configure custom headers in `netlify.toml` for additional security

Happy deploying! 🚀

