# Instructions to Push Code to GitHub

The git repository has been initialized and configured with the remote:
- **Repository:** https://github.com/vidyageorge/Liturgia.git
- **Branch:** main

## Quick Method

Simply double-click the `push_to_github.bat` file in this directory.

## Manual Method

If the batch script doesn't work, follow these steps:

1. Open PowerShell or Command Prompt
2. Navigate to the project directory:
   ```
   cd "c:\vidya\Documents\GitHub\Liturgia"
   ```

3. Clean up any lock files:
   ```
   del .git\index.lock
   del .git\config.lock
   del .git\HEAD.lock
   ```

4. Stage all files:
   ```
   git add .
   ```

5. Create the initial commit:
   ```
   git commit -m "Initial commit: Liturgia Flask application"
   ```

6. Push to GitHub:
   ```
   git push -u origin main
   ```

## Authentication

When you run `git push`, you may be prompted to authenticate:
- GitHub will likely open a browser window for authentication
- Or you may need to enter a Personal Access Token (PAT)
- Follow the prompts that appear

## Troubleshooting

### If push fails due to authentication:
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` permissions
3. Use the token as your password when prompted

### If the repository is not empty:
If GitHub says the repository already has content, you may need to force push (⚠️ this will overwrite remote content):
```
git push -u origin main --force
```

## Files Excluded

The `.gitignore` file has been configured to exclude:
- `__pycache__/` - Python cache files
- `instance/` - Database files
- `.env` files - Environment variables
- IDE configuration files

These files will remain on your local machine but won't be pushed to GitHub.
