# Quick commit and push to DEV branch
param(
    [string]$message = "Update KTW DEV branch"
)

Write-Host "Committing and pushing to DEV..." -ForegroundColor Cyan
git add .
git commit -m $message
git push origin DEV

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to DEV!" -ForegroundColor Green
    git log -1 --oneline
} else {
    Write-Host "❌ Push failed" -ForegroundColor Red
}
