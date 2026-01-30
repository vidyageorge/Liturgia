# Host Liturgia App with Ngrok

## Step 1: Download & Install Ngrok
1. Go to https://ngrok.com/download
2. Sign up for a free account
3. Download ngrok for Windows
4. Extract the zip file to a folder (e.g., C:\ngrok)

## Step 2: Authenticate Ngrok
1. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
2. Open PowerShell and run:
   ```powershell
   C:\ngrok\ngrok.exe config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

## Step 3: Start Your Flask App
1. Make sure your Flask app is running on port 5000
2. Open PowerShell in your project folder:
   ```powershell
   cd C:\vidya\Documents\GitHub\Liturgia
   .\venv\Scripts\Activate.ps1
   python app.py
   ```

## Step 4: Start Ngrok Tunnel
1. Open a NEW PowerShell window
2. Run:
   ```powershell
   C:\ngrok\ngrok.exe http 5000
   ```

## Step 5: Share the URL
- Ngrok will display a URL like: https://abc123.ngrok-free.app
- Share this URL with your friend
- They can access it from anywhere!

## Important Notes:
- Keep both PowerShell windows (Flask app & ngrok) running
- Free ngrok URLs change each time you restart
- Session expires after 2 hours on free plan (just restart ngrok)
- Your computer must stay on and connected to internet

## Security Tips:
- Only share the URL with people you trust
- The ngrok URL is temporary and changes on restart
- Don't commit any sensitive data to the database during testing
