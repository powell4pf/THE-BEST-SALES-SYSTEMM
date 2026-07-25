param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$envFile = Join-Path $Root '.env.local'
if (-not (Test-Path -LiteralPath $envFile)) {
  return $false
}

Get-Content -LiteralPath $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line.Length -eq 0 -or $line.StartsWith('#')) { return }
  $separator = $line.IndexOf('=')
  if ($separator -lt 1) { return }
  $name = $line.Substring(0, $separator).Trim()
  $value = $line.Substring($separator + 1).Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  Set-Item -Path "Env:$name" -Value $value
}

return $true
