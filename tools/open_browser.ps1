$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$osLocale = [Globalization.CultureInfo]::CurrentCulture.Name
$htmlUri = ([Uri](Join-Path $taskRoot 'START.html')).AbsoluteUri
Start-Process -FilePath ($htmlUri + '?namako_os_locale=' + [Uri]::EscapeDataString($osLocale))
