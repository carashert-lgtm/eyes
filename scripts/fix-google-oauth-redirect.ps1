# Opens Google Cloud OAuth client editor with the exact redirect URIs Eyes Open needs.
# Run after Vercel AUTH_URL is https://www.eyesopen.to

$clientId = '47552260151-9udifn91rf9vd142gjgc8ipt2i4g4mh5.apps.googleusercontent.com'
$url = "https://console.cloud.google.com/apis/credentials/oauthclient/$clientId"

Write-Host ""
Write-Host "=== Google OAuth redirect fix ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these EXACT values in Google Cloud Console:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Authorized JavaScript origins:" -ForegroundColor Green
Write-Host "  https://www.eyesopen.to"
Write-Host "  https://eyesopen.to"
Write-Host ""
Write-Host "Authorized redirect URIs:" -ForegroundColor Green
Write-Host "  https://www.eyesopen.to/api/auth/callback/google"
Write-Host "  https://eyesopen.to/api/auth/callback/google"
Write-Host ""
Write-Host "Opening OAuth client editor..." -ForegroundColor Cyan
Start-Process "msedge.exe" $url
