param(
    [string]$PythonVersion = "3.12",
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildVenv = Join-Path $ProjectRoot ".build-venv"
$PythonLauncher = "py"

if ($Clean) {
    foreach ($folder in @("build", "dist", ".build-venv")) {
        $path = Join-Path $ProjectRoot $folder
        if (Test-Path $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
}

if (-not (Test-Path (Join-Path $BuildVenv "Scripts\\python.exe"))) {
    & $PythonLauncher -$PythonVersion -m venv $BuildVenv
}

$PythonExe = Join-Path $BuildVenv "Scripts\\python.exe"

& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install -r (Join-Path $ProjectRoot "requirements-build.txt")

Push-Location $ProjectRoot
try {
    & $PythonExe -m PyInstaller --noconfirm --clean (Join-Path $ProjectRoot "TrackConcursos.spec")
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Build finalizado."
Write-Host "Executavel: $(Join-Path $ProjectRoot 'dist\\TrackConcursos\\TrackConcursos.exe')"
