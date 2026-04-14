# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


project_root = Path.cwd()
www_dir = project_root / 'www'
build_resources_dir = project_root / 'build-resources'
icon_file = build_resources_dir / 'track_concursos_tc.ico'
version_file = build_resources_dir / 'version_info.txt'

datas = [
    (str(www_dir), 'www'),
]

hiddenimports = []


a = Analysis(
    ['Track Concursos.pyw'],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TrackConcursos',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(icon_file),
    version=str(version_file),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TrackConcursos',
)
