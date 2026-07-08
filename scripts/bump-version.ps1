# Script para versionar automaticamente e fazer push com tag
# Uso: .\scripts\bump-version.ps1 -Type patch|minor|major

param(
    [ValidateSet('patch', 'minor', 'major')]
    [string]$Type = 'patch'
)

# Função para incrementar versão
function Increment-Version {
    param(
        [string]$Version,
        [string]$Type
    )
    $parts = $Version -split '\.'
    $major, $minor, $patch = [int]$parts[0], [int]$parts[1], [int]$parts[2]

    switch ($Type) {
        'major' { $major++; $minor = 0; $patch = 0 }
        'minor' { $minor++; $patch = 0 }
        'patch' { $patch++ }
    }

    return "$major.$minor.$patch"
}

# Ler versão atual
$tauriConf = Get-Content 'src-tauri\tauri.conf.json' | ConvertFrom-Json
$packageJson = Get-Content 'package.json' | ConvertFrom-Json
$currentVersion = $tauriConf.version

Write-Host "Versão atual: $currentVersion"

# Calcular nova versão
$newVersion = Increment-Version -Version $currentVersion -Type $Type
Write-Host "Nova versão: $newVersion"

# Atualizar tauri.conf.json
$tauriConf.version = $newVersion
$tauriConf | ConvertTo-Json | Set-Content 'src-tauri\tauri.conf.json'

# Atualizar package.json
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 10 | Set-Content 'package.json'

# Commit e tag
git add package.json 'src-tauri\tauri.conf.json'
git commit -m "v$newVersion"
git tag "v$newVersion"
git push origin main
git push origin "v$newVersion"

Write-Host "✅ Versão $newVersion publicada!"
Write-Host "GitHub Actions iniciará o build automaticamente..."
