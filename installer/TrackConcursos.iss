#define MyAppName "Track Concursos"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "Michel Softwares"
#define MyAppExeName "TrackConcursos.exe"
#define MyAppSourceDir "..\dist\TrackConcursos"
#define MyAppId "{{7F6CC173-3B57-4C1F-BDD2-D36C99A0A4FA}"
#define MyWebView2Url "https://go.microsoft.com/fwlink/p/?LinkId=2124703"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Track Concursos
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
SetupIconFile=..\build-resources\track_concursos_oficial.ico
WizardImageFile=..\build-resources\wizard_michel_large.bmp
WizardSmallImageFile=..\build-resources\wizard_michel_small.bmp
OutputDir=output
OutputBaseFilename=TrackConcursos-Setup-v{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
SetupLogging=yes
UninstallDisplayIcon={app}\{#MyAppExeName}
VersionInfoVersion=1.0.1.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Instalador do Track Concursos
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na area de trabalho"; GroupDescription: "Atalhos adicionais:"; Flags: unchecked

[Files]
Source: "{#MyAppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir o Track Concursos agora"; Flags: nowait postinstall skipifsilent

[Code]
function HasWebView2Runtime(): Boolean;
var
  Version: string;
begin
  Result :=
    RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
    RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
    RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
    DirExists(ExpandConstant('{commonpf32}\Microsoft\EdgeWebView\Application')) or
    DirExists(ExpandConstant('{commonpf64}\Microsoft\EdgeWebView\Application'));
end;

function InitializeSetup(): Boolean;
var
  Choice: Integer;
  Opened: Boolean;
  ErrorCode: Integer;
begin
  Result := True;

  if HasWebView2Runtime() then
    exit;

  Choice := MsgBox(
    'O Microsoft Edge WebView2 Runtime nao foi encontrado neste computador.' + #13#10 + #13#10 +
    'O Track Concursos precisa desse componente para abrir a interface.' + #13#10 + #13#10 +
    'Clique em Sim para abrir a pagina oficial de download antes de continuar.' + #13#10 +
    'Clique em Nao para continuar mesmo assim.',
    mbConfirmation,
    MB_YESNOCANCEL
  );

  if Choice = IDCANCEL then
  begin
    Result := False;
    exit;
  end;

  if Choice = IDYES then
  begin
    Opened := ShellExecAsOriginalUser(
      'open',
      '{#MyWebView2Url}',
      '',
      '',
      SW_SHOWNORMAL,
      ewNoWait,
      ErrorCode
    );

    if not Opened then
      MsgBox(
        'Nao foi possivel abrir automaticamente a pagina de download do WebView2.' + #13#10 + #13#10 +
        'Acesse manualmente:' + #13#10 + '{#MyWebView2Url}',
        mbInformation,
        MB_OK
      );
  end;
end;
