# WSL2 Port Forward Fix Script
# Run with Administrator privileges

param(
    [string]$Action = "fix",  # fix, status, clean
    [int[]]$Ports = @(3001, 5174, 3306, 6379, 18080, 8080, 8000)
)

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script with Administrator privileges!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    exit 1
}

function Get-WSL2IP {
    $ip = wsl -d Ubuntu -- bash -c "ip addr show | grep -E 'inet [0-9]' | grep -v '127.0.0.1' | head -1 | awk '{print `$2}' | cut -d'/' -f1" 2>$null
    if ([string]::IsNullOrWhiteSpace($ip)) {
        # Try default WSL
        $ip = wsl -- bash -c "ip addr show | grep -E 'inet [0-9]' | grep -v '127.0.0.1' | head -1 | awk '{print `$2}' | cut -d'/' -f1" 2>$null
    }
    return $ip.Trim()
}

function Show-Status {
    Write-Host "`n========== WSL2 Port Forward Status ==========" -ForegroundColor Cyan
    
    # Get WSL2 IP
    $wslIP = Get-WSL2IP
    if ([string]::IsNullOrWhiteSpace($wslIP)) {
        Write-Host "WSL2 IP: Not available (WSL may not be running)" -ForegroundColor Yellow
    } else {
        Write-Host "WSL2 IP Address: $wslIP" -ForegroundColor Green
    }
    
    # Show current portproxy rules
    Write-Host "`nCurrent Portproxy Rules:" -ForegroundColor Yellow
    netsh interface portproxy show all
    
    # Show listening ports
    Write-Host "`nWindows Listening Ports (relevant):" -ForegroundColor Yellow
    netstat -ano | Select-String -Pattern "LISTENING" | Select-String -Pattern ($Ports -join "|")
    
    # Test connections
    Write-Host "`nPort Connection Test:" -ForegroundColor Yellow
    foreach ($port in $Ports) {
        $result = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        $status = if ($result.TcpTestSucceeded) { "[OK] Accessible" } else { "[X] Not accessible" }
        $color = if ($result.TcpTestSucceeded) { "Green" } else { "Red" }
        Write-Host "  Port $port : $status" -ForegroundColor $color
    }
}

function Fix-PortForward {
    Write-Host "`n========== Fix WSL2 Port Forward ==========" -ForegroundColor Cyan
    
    # Get WSL2 IP
    $wslIP = Get-WSL2IP
    if ([string]::IsNullOrWhiteSpace($wslIP)) {
        Write-Host "ERROR: Cannot get WSL2 IP address!" -ForegroundColor Red
        Write-Host "Please ensure WSL2 is running: wsl --list --verbose" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "WSL2 IP Address: $wslIP" -ForegroundColor Green
    
    # Clear old rules
    Write-Host "`nClearing old portproxy rules..." -ForegroundColor Yellow
    foreach ($port in $Ports) {
        netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port 2>$null
        netsh interface portproxy delete v4tov4 listenaddress=127.0.0.1 listenport=$port 2>$null
    }
    
    # Add new rules
    Write-Host "`nAdding new portproxy rules..." -ForegroundColor Yellow
    foreach ($port in $Ports) {
        netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wslIP connectport=$port
        Write-Host "  Added: 0.0.0.0:$port -> ${wslIP}:$port" -ForegroundColor Green
    }
    
    # Configure firewall
    Write-Host "`nConfiguring firewall rules..." -ForegroundColor Yellow
    
    # Delete old rule if exists
    netsh advfirewall firewall delete rule name="WSL2 Port Forward" 2>$null
    
    # Add new rule
    $portsStr = $Ports -join ","
    netsh advfirewall firewall add rule `
        name="WSL2 Port Forward" `
        dir=in `
        action=allow `
        protocol=tcp `
        localport=$portsStr
    
    Write-Host "Firewall rule added: WSL2 Port Forward (ports: $portsStr)" -ForegroundColor Green
    
    # Enable IP forwarding
    Write-Host "`nChecking IP forwarding settings..." -ForegroundColor Yellow
    $ipForwarding = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "IPEnableRouter"
    if ($ipForwarding.IPEnableRouter -ne 1) {
        Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "IPEnableRouter" -Value 1
        Write-Host "IP forwarding enabled (requires restart to take effect)" -ForegroundColor Yellow
    } else {
        Write-Host "IP forwarding already enabled" -ForegroundColor Green
    }
    
    # Show final status
    Write-Host "`n========== Final Configuration ==========" -ForegroundColor Cyan
    netsh interface portproxy show all
    
    Write-Host "`nPort forward fix completed!" -ForegroundColor Green
    Write-Host "If still not accessible, try:" -ForegroundColor Yellow
    Write-Host "  1. Restart Docker Desktop" -ForegroundColor Yellow
    Write-Host "  2. Restart WSL: wsl --shutdown" -ForegroundColor Yellow
    Write-Host "  3. Re-run this script" -ForegroundColor Yellow
}

function Clean-PortForward {
    Write-Host "`n========== Clean WSL2 Port Forward ==========" -ForegroundColor Cyan
    
    foreach ($port in $Ports) {
        netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port 2>$null
        netsh interface portproxy delete v4tov4 listenaddress=127.0.0.1 listenport=$port 2>$null
        Write-Host "Deleted rule for port $port" -ForegroundColor Yellow
    }
    
    netsh advfirewall firewall delete rule name="WSL2 Port Forward" 2>$null
    Write-Host "Deleted firewall rule" -ForegroundColor Yellow
    
    Write-Host "`nCleanup completed!" -ForegroundColor Green
}

# Main logic
switch ($Action.ToLower()) {
    "fix"   { Fix-PortForward }
    "status" { Show-Status }
    "clean" { Clean-PortForward }
    default { 
        Write-Host "Usage: .\fix-wsl2-port-forward.ps1 -Action [fix|status|clean]"
        Write-Host "  fix   - Fix port forward"
        Write-Host "  status - Show current status"
        Write-Host "  clean - Clean all rules"
    }
}