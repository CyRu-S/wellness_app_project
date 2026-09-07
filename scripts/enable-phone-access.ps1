[CmdletBinding()]
param([switch]$Undo, [switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
# Inspect the existing Public-profile TCP rules on this PC using named actions.
# Allow rules need no changes; only verified Block rules need scoped exceptions.
function Normalize-ProgramPath([string]$Path) {
    return ($Path -replace '\\{2,}', '\').Trim().ToLowerInvariant()
}
$services = @(
    @{
        Name = 'MrCare-Phone-API'
        Program = 'C:\Program Files\Java\jdk-25\bin\java.exe'
        Port = 8080
        OtherPorts = @('1-8079', '8081-65535')
        BlockRule = 'TCP Query User{B513163A-973A-4401-85AA-859E911DE7B9}C:\program files\java\jdk-25\bin\java.exe'
    },
    @{
        Name = 'MrCare-Phone-Expo'
        Program = 'C:\Program Files\nodejs\node.exe'
        Port = 8081
        OtherPorts = @('1-8080', '8082-65535')
        BlockRule = 'TCP Query User{52AFEACD-FE87-47F9-88D1-2CD180EE084A}C:\program files\nodejs\node.exe'
    }
)

$wifi = Get-NetIPConfiguration -InterfaceAlias 'Wi-Fi'
$wifiAddress = $wifi.IPv4Address.IPAddress | Select-Object -First 1
if (!$Undo -and !$wifiAddress) { throw 'Connect this computer to Wi-Fi first.' }

# Validate every target before changing any firewall setting.
foreach ($service in $services) {
    $rule = Get-NetFirewallRule -Name $service.BlockRule
    $application = $rule | Get-NetFirewallApplicationFilter
    $ports = $rule | Get-NetFirewallPortFilter
    if ([string]$rule.Action -notin @('Allow', 'Block') -or
        [string]$rule.Direction -ne 'Inbound' -or
        (Normalize-ProgramPath $application.Program) -ne (Normalize-ProgramPath $service.Program) -or
        [string]$ports.Protocol -notin @('TCP', '6')) {
        throw "Unexpected firewall rule for $($service.Name): Action=$($rule.Action), Program=$($application.Program), Protocol=$($ports.Protocol). No changes made."
    }
    $service.ExistingAction = [string]$rule.Action
    $actualPorts = @($ports.LocalPort) -join ','
    if ($actualPorts -ne 'Any' -and $actualPorts -ne ($service.OtherPorts -join ',')) {
        throw "The existing port restriction for $($service.Name) has changed; inspect it manually."
    }
    $existing = Get-NetFirewallRule -Name $service.Name -ErrorAction SilentlyContinue
    if ($existing -and $existing.Group -ne 'MrCare local phone development') {
        throw "An unrelated rule uses the name $($service.Name); refusing to overwrite it."
    }
    $service.HasException = [bool]$existing
    Write-Output "$($service.Name): existing action=$($rule.Action), enabled=$($rule.Enabled), profile=$($rule.Profile), ports=$actualPorts."
    if ([string]$rule.Enabled -ne 'True') { throw 'The existing rule is disabled; inspect its intended configuration before proceeding.' }
}

if ($CheckOnly) {
    Write-Output 'Read-only check complete. No firewall settings changed.'
    return
}
$needsChanges = @($services | Where-Object { $_.ExistingAction -eq 'Block' -or ($Undo -and $_.HasException) }).Count -gt 0
if ($needsChanges) {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (!$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'The required firewall changes need Administrator PowerShell. No changes made.'
    }
}
foreach ($service in $services) {
    if ($Undo) {
        if ($service.ExistingAction -eq 'Block') { Set-NetFirewallRule -Name $service.BlockRule -LocalPort Any }
        if ($service.HasException) { Get-NetFirewallRule -Name $service.Name | Remove-NetFirewallRule }
        continue
    }
    if ($service.ExistingAction -eq 'Allow') {
        Write-Output "$($service.Name): existing Allow rule left unchanged; no exception needed."
        continue
    }
    $existing = Get-NetFirewallRule -Name $service.Name -ErrorAction SilentlyContinue
    if (!$existing) {
        New-NetFirewallRule -Name $service.Name -DisplayName $service.Name `
            -Group 'MrCare local phone development' -Direction Inbound -Action Allow `
            -Enabled True -Protocol TCP -LocalPort $service.Port -Program $service.Program `
            -Profile Public,Private -InterfaceAlias 'Wi-Fi' -LocalAddress $wifiAddress `
            -RemoteAddress LocalSubnet | Out-Null
    } else {
        Set-NetFirewallRule -Name $service.Name -LocalAddress $wifiAddress -Enabled True
    }
    Set-NetFirewallRule -Name $service.BlockRule -LocalPort $service.OtherPorts
    Write-Output "Allowed $($service.Name) on Wi-Fi $wifiAddress port $($service.Port), local subnet only."
}
if ($Undo) { Write-Output 'Removed any MrCare exceptions and restored any modified TCP Block rules. Existing Allow rules were preserved.' }
elseif (!$needsChanges) { Write-Output 'Both existing rules already allow access. No firewall settings changed. Test connectivity from the phone next.' }
else { Write-Output 'Firewall remains enabled. Use -Undo with this script to restore any modified Block rules.' }
