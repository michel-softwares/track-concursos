"""
Track Concursos - Launcher
"""

import base64
import json
import os
import re
import shutil
import sys
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import webview


def resource_path(relative):
    if hasattr(sys, '_MEIPASS'):
        base = sys._MEIPASS
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative)


APP_DIR = os.path.dirname(os.path.abspath(__file__))


def _resource_root():
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return APP_DIR


def _install_root():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return APP_DIR


def _portable_mode_enabled():
    portable_flag = str(os.environ.get('TRACK_CONCURSOS_PORTABLE') or '').strip().lower()
    if portable_flag in ('1', 'true', 'yes', 'on'):
        return True
    return os.path.exists(os.path.join(_install_root(), 'portable.mode'))


def _default_data_dir():
    if _portable_mode_enabled():
        return _install_root()

    if not getattr(sys, 'frozen', False):
        return APP_DIR

    appdata_root = (
        os.environ.get('LOCALAPPDATA')
        or os.environ.get('APPDATA')
        or os.path.expanduser('~')
    )
    return os.path.join(appdata_root, 'Track Concursos')


RESOURCE_DIR = _resource_root()
INSTALL_DIR = _install_root()
DATA_DIR = _default_data_dir()
WWW_DIR = resource_path('www')
START_PAGE = os.path.join(WWW_DIR, 'concursos.html')

BACKUP_DIR = os.path.join(DATA_DIR, 'backups')
BACKUP_FILE = os.path.join(BACKUP_DIR, 'Track_Concursos_backup.json')
LEGACY_BACKUP_FILE = os.path.join(BACKUP_DIR, 'ConcursoTrack_backup.json')
BACKUP_STATE_FILE = os.path.join(BACKUP_DIR, 'backup_state.json')

PROFILES_DIR = os.path.join(DATA_DIR, 'profiles')
PROFILE_MANIFEST_FILE = os.path.join(PROFILES_DIR, 'manifest.json')
LOGOS_DIR = os.path.join(DATA_DIR, 'logos')
DEFAULT_PROFILE_ID = 'principal'
DEFAULT_PROFILE_NAME = 'Perfil Principal'
DEFAULT_PROFILE_GENDER = 'masculino'
PROFILE_FILE_NAME = 'profile.json'
SNAPSHOTS_DIR_NAME = 'snapshots'
SNAPSHOT_KEEP_LATEST = 20
SNAPSHOT_KEEP_DAILY_DAYS = 30

PROFILE_ARRAY_KEYS = (
    'concursos',
    'materias',
    'topicos',
    'subtopicos',
    'sessoes',
    'questoes',
    'simulados',
    'revisoes',
)
PROFILE_OBJECT_KEYS = ('crono', 'logos')

APP_VERSION = '1.0.1'
GITHUB_REPO = 'michel-softwares/track-concursos'
GITHUB_RELEASES_URL = f'https://github.com/{GITHUB_REPO}/releases/latest'

_window = None
_perfil_carregado = False
_pode_fechar = False


def _now_iso():
    return datetime.now().astimezone().isoformat(timespec='seconds')


def _snapshot_stamp():
    return datetime.now().strftime('%Y-%m-%d_%H-%M-%S-%f')


def _sanitize_reason(reason):
    cleaned = ''.join(
        ch if ch.isalnum() or ch in ('-', '_') else '-'
        for ch in (reason or 'snapshot').strip().lower()
    )
    cleaned = cleaned.strip('-')
    return cleaned or 'snapshot'


def _default_backup_payload():
    return {
        'versao': '1.0',
        'exportadoEm': _now_iso(),
        'concursos': [],
        'materias': [],
        'topicos': [],
        'subtopicos': [],
        'sessoes': [],
        'questoes': [],
        'simulados': [],
        'revisoes': [],
        'crono': {},
        'logos': {},
    }


def _looks_like_profile_payload(data):
    if not isinstance(data, dict):
        return False

    payload_type = str(data.get('type') or '').strip().lower()
    if payload_type.startswith('track_concursos_template_') or data.get('templateKind'):
        return False

    meaningful_keys = (
        'concursos',
        'topicos',
        'subtopicos',
        'sessoes',
        'questoes',
        'simulados',
        'revisoes',
        'crono',
        'logos',
    )
    return any(key in data for key in meaningful_keys)


def _normalize_backup_payload(data):
    if not isinstance(data, dict):
        return _default_backup_payload()

    normalized = dict(data)
    default_payload = _default_backup_payload()
    normalized['versao'] = normalized.get('versao') or default_payload['versao']
    normalized['exportadoEm'] = normalized.get('exportadoEm') or default_payload['exportadoEm']

    for key in PROFILE_ARRAY_KEYS:
        normalized[key] = normalized.get(key) if isinstance(normalized.get(key), list) else []

    for key in PROFILE_OBJECT_KEYS:
        normalized[key] = normalized.get(key) if isinstance(normalized.get(key), dict) else {}

    return normalized


def _dump_json(data):
    return json.dumps(data, ensure_ascii=False, indent=2)


def _path_to_file_url(path):
    return Path(path).resolve().as_uri()


def _find_logo_file(contest_id):
    for ext in ('png', 'jpg', 'jpeg'):
        candidate = os.path.join(LOGOS_DIR, f'{contest_id}.{ext}')
        if os.path.exists(candidate):
            return candidate
    return None


def _write_text_atomic(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    temp_path = f'{path}.tmp'
    with open(temp_path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp_path, path)


def _write_json_atomic(path, data):
    _write_text_atomic(path, _dump_json(data))


def _read_json_file(path):
    with open(path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def _load_json_if_exists(path):
    if not os.path.exists(path):
        return None
    try:
        return _read_json_file(path)
    except Exception:
        return None


def _load_profile_payload_file(path):
    data = _read_json_file(path)
    if not _looks_like_profile_payload(data):
        raise ValueError('arquivo não corresponde a um perfil válido do Track Concursos')
    return _normalize_backup_payload(data)


def _profile_paths(profile_id):
    profile_dir = os.path.join(PROFILES_DIR, profile_id)
    return {
        'dir': profile_dir,
        'profile_file': os.path.join(profile_dir, PROFILE_FILE_NAME),
        'snapshots_dir': os.path.join(profile_dir, SNAPSHOTS_DIR_NAME),
    }


def _default_manifest():
    return {
        'version': 1,
        'active_profile_id': DEFAULT_PROFILE_ID,
        'profiles': [
            {
                'id': DEFAULT_PROFILE_ID,
                'name': DEFAULT_PROFILE_NAME,
                'created_at': _now_iso(),
            }
        ],
    }


def _load_manifest():
    return _normalize_manifest(_load_json_if_exists(PROFILE_MANIFEST_FILE))


def _save_manifest(manifest):
    os.makedirs(PROFILES_DIR, exist_ok=True)
    _write_json_atomic(PROFILE_MANIFEST_FILE, _normalize_manifest(manifest))


def _normalize_profile_gender(value):
    normalized = str(value or '').strip().lower()
    if normalized not in ('masculino', 'feminino'):
        return DEFAULT_PROFILE_GENDER
    return normalized


def _normalize_manifest(data):
    manifest = _default_manifest()
    if not isinstance(data, dict):
        return manifest

    profiles = []
    seen = set()
    for entry in data.get('profiles', []):
        if not isinstance(entry, dict):
            continue
        profile_id = str(entry.get('id') or '').strip()
        if not profile_id or profile_id in seen:
            continue
        seen.add(profile_id)
        profiles.append(
            {
                'id': profile_id,
                'name': str(entry.get('name') or DEFAULT_PROFILE_NAME).strip() or DEFAULT_PROFILE_NAME,
                'gender': _normalize_profile_gender(entry.get('gender')),
                'created_at': entry.get('created_at') or _now_iso(),
            }
        )

    if not any(profile['id'] == DEFAULT_PROFILE_ID for profile in profiles):
        profiles.insert(
            0,
            {
                'id': DEFAULT_PROFILE_ID,
                'name': DEFAULT_PROFILE_NAME,
                'gender': DEFAULT_PROFILE_GENDER,
                'created_at': _now_iso(),
            },
        )

    active_id = str(data.get('active_profile_id') or DEFAULT_PROFILE_ID).strip() or DEFAULT_PROFILE_ID
    if not any(profile['id'] == active_id for profile in profiles):
        active_id = DEFAULT_PROFILE_ID

    manifest['version'] = data.get('version') or 1
    manifest['active_profile_id'] = active_id
    manifest['profiles'] = profiles
    return manifest


def _find_profile_entry(manifest, profile_id):
    for profile in manifest.get('profiles', []):
        if profile.get('id') == profile_id:
            return profile
    return None


def _active_profile_entry(manifest):
    active_id = manifest.get('active_profile_id') or DEFAULT_PROFILE_ID
    profile = _find_profile_entry(manifest, active_id)
    if profile:
        return profile
    return {
        'id': DEFAULT_PROFILE_ID,
        'name': DEFAULT_PROFILE_NAME,
        'gender': DEFAULT_PROFILE_GENDER,
        'created_at': _now_iso(),
    }


def _generate_profile_id(name, existing_ids):
    base = re.sub(r'[^a-z0-9]+', '-', str(name or '').strip().lower())
    base = base.strip('-') or 'perfil'
    if base not in existing_ids:
        return base

    suffix = 2
    while f'{base}-{suffix}' in existing_ids:
        suffix += 1
    return f'{base}-{suffix}'


def _update_active_profile(new_name=None, gender=None):
    manifest = _normalize_manifest(_load_json_if_exists(PROFILE_MANIFEST_FILE))
    active_id = manifest.get('active_profile_id') or DEFAULT_PROFILE_ID
    updated = False
    for profile in manifest.get('profiles', []):
        if profile.get('id') == active_id:
            if new_name is not None:
                normalized_name = str(new_name or '').strip()
                if not normalized_name:
                    raise ValueError('o nome do perfil não pode ficar vazio')
                if len(normalized_name) > 80:
                    raise ValueError('o nome do perfil deve ter no máximo 80 caracteres')
                profile['name'] = normalized_name
            if gender is not None:
                profile['gender'] = _normalize_profile_gender(gender)
            updated = True
            break

    if not updated:
        raise ValueError('perfil ativo não encontrado')

    _write_json_atomic(PROFILE_MANIFEST_FILE, manifest)
    return _active_profile_entry(manifest)


def _ensure_profile_files(profile_entry, allow_legacy_migration=False):
    paths = _profile_paths(profile_entry['id'])
    os.makedirs(paths['dir'], exist_ok=True)
    os.makedirs(paths['snapshots_dir'], exist_ok=True)

    if os.path.exists(paths['profile_file']):
        return paths

    if allow_legacy_migration:
        for legacy_path in _legacy_backup_candidates():
            try:
                payload = _load_profile_payload_file(legacy_path)
                _write_json_atomic(paths['profile_file'], payload)
                _save_snapshot(paths, payload, 'migracao-inicial')
                print(f'[Track Concursos] Perfil principal criado a partir de: {legacy_path}')
                return paths
            except Exception as exc:
                print(f'[Track Concursos] Falha ao migrar backup legado {legacy_path}: {exc}')

    payload = _default_backup_payload()
    _write_json_atomic(paths['profile_file'], payload)
    _save_snapshot(paths, payload, 'perfil-inicial')
    if profile_entry.get('id') == DEFAULT_PROFILE_ID:
        print('[Track Concursos] Perfil principal criado vazio.')
    else:
        print(f"[Track Concursos] Novo perfil criado: {profile_entry.get('name', profile_entry.get('id'))}")
    return paths


def _count_snapshots(paths):
    snapshots_dir = paths['snapshots_dir']
    if not os.path.isdir(snapshots_dir):
        return 0
    return len(
        [
            name
            for name in os.listdir(snapshots_dir)
            if name.lower().endswith('.json')
            and os.path.isfile(os.path.join(snapshots_dir, name))
        ]
    )


def _snapshot_datetime(path):
    name = os.path.basename(path)
    stamp = name.split('__', 1)[0]
    try:
        return datetime.strptime(stamp, '%Y-%m-%d_%H-%M-%S-%f')
    except Exception:
        return datetime.fromtimestamp(os.path.getmtime(path))


def _list_snapshot_entries(paths):
    snapshots_dir = paths['snapshots_dir']
    if not os.path.isdir(snapshots_dir):
        return []

    entries = []
    for name in os.listdir(snapshots_dir):
        path = os.path.join(snapshots_dir, name)
        if not name.lower().endswith('.json') or not os.path.isfile(path):
            continue
        try:
            snapshot_dt = _snapshot_datetime(path)
        except Exception:
            continue
        entries.append(
            {
                'path': path,
                'name': name,
                'datetime': snapshot_dt,
            }
        )

    entries.sort(key=lambda entry: (entry['datetime'], entry['name']), reverse=True)
    return entries


def _prune_snapshots(paths):
    snapshots_dir = os.path.abspath(paths['snapshots_dir'])
    entries = _list_snapshot_entries(paths)
    if len(entries) <= SNAPSHOT_KEEP_LATEST:
        return {'apagados': 0, 'mantidos': len(entries)}

    keep_paths = {
        os.path.abspath(entry['path'])
        for entry in entries[:SNAPSHOT_KEEP_LATEST]
    }

    cutoff = datetime.now() - timedelta(days=SNAPSHOT_KEEP_DAILY_DAYS)
    seen_days = set()
    for entry in entries:
        snapshot_dt = entry['datetime']
        if snapshot_dt < cutoff:
            continue
        day_key = snapshot_dt.date()
        if day_key in seen_days:
            continue
        seen_days.add(day_key)
        keep_paths.add(os.path.abspath(entry['path']))

    deleted = 0
    for entry in entries:
        path = os.path.abspath(entry['path'])
        if path in keep_paths:
            continue
        try:
            if os.path.commonpath([snapshots_dir, path]) != snapshots_dir:
                continue
            if not path.lower().endswith('.json') or not os.path.isfile(path):
                continue
            os.remove(path)
            deleted += 1
        except Exception as exc:
            print(f'[Track Concursos] Falha ao limpar snapshot antigo {path}: {exc}')

    return {'apagados': deleted, 'mantidos': len(entries) - deleted}


def _latest_snapshot_path(paths):
    snapshots_dir = paths['snapshots_dir']
    if not os.path.isdir(snapshots_dir):
        return None

    candidates = [
        os.path.join(snapshots_dir, name)
        for name in os.listdir(snapshots_dir)
        if name.lower().endswith('.json')
    ]
    candidates = [path for path in candidates if os.path.isfile(path)]
    if not candidates:
        return None
    return max(candidates, key=os.path.getmtime)


def _save_snapshot(paths, data, reason):
    normalized = _normalize_backup_payload(data)
    snapshots_dir = paths['snapshots_dir']
    os.makedirs(snapshots_dir, exist_ok=True)
    snapshot_name = f'{_snapshot_stamp()}__{_sanitize_reason(reason)}.json'
    snapshot_path = os.path.join(snapshots_dir, snapshot_name)
    _write_text_atomic(snapshot_path, _dump_json(normalized))
    _prune_snapshots(paths)
    return snapshot_path


def _legacy_backup_path_from_state():
    if not os.path.exists(BACKUP_STATE_FILE):
        return None
    try:
        data = _read_json_file(BACKUP_STATE_FILE)
    except Exception as exc:
        print(f'[Track Concursos] Erro ao ler estado do backup legado: {exc}')
        return None

    path = data.get('backup_atual')
    if not path:
        return None
    normalized = os.path.abspath(path)
    return normalized if os.path.exists(normalized) else None


def _legacy_backup_candidates():
    candidates = []

    state_path = _legacy_backup_path_from_state()
    if state_path:
        candidates.append(state_path)

    for path in (BACKUP_FILE, LEGACY_BACKUP_FILE):
        if os.path.exists(path):
            candidates.append(path)

    if os.path.isdir(BACKUP_DIR):
        backup_files = [
            os.path.join(BACKUP_DIR, name)
            for name in os.listdir(BACKUP_DIR)
            if name.lower().endswith('.json') and name != os.path.basename(BACKUP_STATE_FILE)
        ]
        backup_files = [path for path in backup_files if os.path.isfile(path)]
        backup_files.sort(key=os.path.getmtime, reverse=True)
        candidates.extend(backup_files)

    unique_candidates = []
    seen = set()
    for path in candidates:
        normalized = os.path.abspath(path)
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_candidates.append(normalized)
    return unique_candidates


def _copy_tree_if_needed(source_dir, target_dir):
    if not os.path.isdir(source_dir):
        return False
    os.makedirs(os.path.dirname(target_dir), exist_ok=True)
    shutil.copytree(source_dir, target_dir, dirs_exist_ok=True)
    return True


def _migrate_legacy_storage():
    if os.path.abspath(DATA_DIR) == os.path.abspath(INSTALL_DIR):
        return

    legacy_profiles_dir = os.path.join(INSTALL_DIR, 'profiles')
    legacy_backups_dir = os.path.join(INSTALL_DIR, 'backups')
    legacy_logos_dir = os.path.join(INSTALL_DIR, 'www', 'assets', 'logos')

    migrated_any = False

    if not os.path.exists(PROFILE_MANIFEST_FILE):
        migrated_any = _copy_tree_if_needed(legacy_profiles_dir, PROFILES_DIR) or migrated_any

    if not os.path.isdir(BACKUP_DIR) or not os.listdir(BACKUP_DIR):
        migrated_any = _copy_tree_if_needed(legacy_backups_dir, BACKUP_DIR) or migrated_any

    if not os.path.isdir(LOGOS_DIR) or not os.listdir(LOGOS_DIR):
        migrated_any = _copy_tree_if_needed(legacy_logos_dir, LOGOS_DIR) or migrated_any

    if migrated_any:
        print(f'[Track Concursos] Dados migrados para: {DATA_DIR}')


def _ensure_profile_storage():
    _migrate_legacy_storage()
    os.makedirs(PROFILES_DIR, exist_ok=True)

    manifest = _load_manifest()
    _save_manifest(manifest)

    profile_entry = _active_profile_entry(manifest)
    paths = _ensure_profile_files(profile_entry, allow_legacy_migration=False)

    return manifest, profile_entry, paths


def _load_profile_payload(paths):
    try:
        return _load_profile_payload_file(paths['profile_file'])
    except Exception as exc:
        print(f'[Track Concursos] Erro ao ler perfil principal: {exc}')

    latest_snapshot = _latest_snapshot_path(paths)
    if latest_snapshot:
        try:
            payload = _load_profile_payload_file(latest_snapshot)
            _write_json_atomic(paths['profile_file'], payload)
            print(f'[Track Concursos] Perfil principal restaurado automaticamente do snapshot: {latest_snapshot}')
            return payload
        except Exception as exc:
            print(f'[Track Concursos] Falha ao recuperar perfil pelo snapshot {latest_snapshot}: {exc}')

    payload = _default_backup_payload()
    _write_json_atomic(paths['profile_file'], payload)
    return payload


def _persist_profile_payload(data, reason):
    manifest, profile_entry, paths = _ensure_profile_storage()
    payload = _normalize_backup_payload(data)
    payload['exportadoEm'] = _now_iso()
    text = _dump_json(payload)

    _write_text_atomic(paths['profile_file'], text)
    snapshot_path = _save_snapshot(paths, payload, reason)

    return {
        'ok': True,
        'caminho': paths['profile_file'],
        'snapshot': snapshot_path,
        'rotulo': profile_entry.get('name', DEFAULT_PROFILE_NAME),
        'total_snapshots': _count_snapshots(paths),
        'manifesto': PROFILE_MANIFEST_FILE,
    }


def _profile_summary(profile_entry, include_payload_meta=False):
    paths = _ensure_profile_files(profile_entry, allow_legacy_migration=False)
    summary = {
        'id': profile_entry.get('id', DEFAULT_PROFILE_ID),
        'nome': profile_entry.get('name', DEFAULT_PROFILE_NAME),
        'genero': _normalize_profile_gender(profile_entry.get('gender')),
        'caminho': paths['profile_file'],
        'snapshots_dir': paths['snapshots_dir'],
        'total_snapshots': _count_snapshots(paths),
    }
    if include_payload_meta:
        payload = _load_profile_payload(paths)
        summary['total_concursos'] = len(payload.get('concursos', []))
    return summary


def _list_profiles():
    manifest, profile_entry, _ = _ensure_profile_storage()
    profiles = []
    for entry in manifest.get('profiles', []):
        summary = _profile_summary(entry, include_payload_meta=True)
        summary['ativo'] = entry.get('id') == profile_entry.get('id')
        profiles.append(summary)

    return {
        'ok': True,
        'ativo_id': profile_entry.get('id', DEFAULT_PROFILE_ID),
        'ativo_nome': profile_entry.get('name', DEFAULT_PROFILE_NAME),
        'profiles': profiles,
    }


def _create_profile(name, gender=None):
    normalized_name = str(name or '').strip()
    if not normalized_name:
        raise ValueError('o nome do novo perfil não pode ficar vazio')
    if len(normalized_name) > 80:
        raise ValueError('o nome do novo perfil deve ter no máximo 80 caracteres')

    manifest, _, _ = _ensure_profile_storage()
    existing_ids = {entry.get('id') for entry in manifest.get('profiles', [])}
    existing_names = {str(entry.get('name') or '').strip().lower() for entry in manifest.get('profiles', [])}
    if normalized_name.lower() in existing_names:
        raise ValueError('já existe um perfil com esse nome')

    profile_id = _generate_profile_id(normalized_name, existing_ids)
    entry = {
        'id': profile_id,
        'name': normalized_name,
        'gender': _normalize_profile_gender(gender),
        'created_at': _now_iso(),
    }
    manifest['profiles'].append(entry)
    _save_manifest(manifest)
    return _profile_summary(entry, include_payload_meta=True)


def _switch_active_profile(profile_id):
    manifest, active_entry, _ = _ensure_profile_storage()
    target_id = str(profile_id or '').strip()
    target_entry = _find_profile_entry(manifest, target_id)
    if not target_entry:
        raise ValueError('perfil selecionado não foi encontrado')

    if target_entry.get('id') != active_entry.get('id'):
        manifest['active_profile_id'] = target_entry.get('id')
        _save_manifest(manifest)

    paths = _ensure_profile_files(target_entry, allow_legacy_migration=False)
    payload = _load_profile_payload(paths)
    summary = _profile_summary(target_entry, include_payload_meta=True)
    summary.update(
        {
            'ok': True,
            'conteudo': _dump_json(payload),
        }
    )
    return summary


def _delete_profile(profile_id):
    manifest, active_entry, _ = _ensure_profile_storage()
    target_id = str(profile_id or '').strip()
    if not target_id:
        raise ValueError('perfil inválido para exclusão')

    target_entry = _find_profile_entry(manifest, target_id)
    if not target_entry:
        raise ValueError('perfil selecionado não foi encontrado')

    if target_entry.get('id') == active_entry.get('id'):
        raise ValueError('o perfil ativo não pode ser excluído')

    profiles = list(manifest.get('profiles', []))
    if len(profiles) <= 1:
        raise ValueError('não é possível excluir o último perfil disponível')

    remaining_profiles = [entry for entry in profiles if entry.get('id') != target_id]
    if len(remaining_profiles) == len(profiles):
        raise ValueError('perfil selecionado não foi encontrado')

    paths = _profile_paths(target_id)
    profiles_root = os.path.abspath(PROFILES_DIR)
    target_dir = os.path.abspath(paths['dir'])
    if os.path.commonpath([profiles_root, target_dir]) != profiles_root:
        raise ValueError('a pasta do perfil está fora da área segura do aplicativo')

    manifest['profiles'] = remaining_profiles
    _save_manifest(manifest)

    if os.path.isdir(target_dir):
        shutil.rmtree(target_dir)

    return {
        'ok': True,
        'id': target_entry.get('id'),
        'nome': target_entry.get('name', DEFAULT_PROFILE_NAME),
        'genero': _normalize_profile_gender(target_entry.get('gender')),
        'total_restante': len(remaining_profiles),
    }


def _restore_logos_from_payload(data):
    try:
        logos = {}
        logo_map = data.get('logos', {})
        if isinstance(logo_map, dict):
            logos.update(logo_map)

        for concurso in data.get('concursos', []):
            if isinstance(concurso, dict) and concurso.get('id') and concurso.get('logoBase64'):
                logos.setdefault(concurso['id'], concurso['logoBase64'])

        if not logos:
            return

        os.makedirs(LOGOS_DIR, exist_ok=True)

        for contest_id, base64_data in logos.items():
            if not contest_id or not base64_data:
                continue
            raw_data = base64_data.split(',', 1)[1] if ',' in base64_data else base64_data
            with open(os.path.join(LOGOS_DIR, f'{contest_id}.png'), 'wb') as handle:
                handle.write(base64.b64decode(raw_data))
    except Exception as exc:
        print(f'[Track Concursos] Erro ao restaurar logos do perfil: {exc}')


def _clear_track_local_storage():
    if not _window:
        return
    script = """
    (() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ct_')) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    })();
    """
    _window.evaluate_js(script)


def carregar_perfil_inicial():
    global _perfil_carregado

    if _perfil_carregado:
        return

    try:
        manifest, profile_entry, paths = _ensure_profile_storage()
        payload = _load_profile_payload(paths)

        _clear_track_local_storage()
        _restore_logos_from_payload(payload)

        for key in PROFILE_ARRAY_KEYS:
            value = payload.get(key, [])
            json_str = json.dumps(value, ensure_ascii=False)
            json_str = json_str.replace('\\', '\\\\').replace("'", "\\'")
            _window.evaluate_js(f"localStorage.setItem('ct_{key}', '{json_str}');")

        aux_data = payload.get('crono', {})
        if isinstance(aux_data, dict):
            for key, value in aux_data.items():
                safe_key = str(key).replace('\\', '\\\\').replace("'", "\\'")
                safe_value = str(value).replace('\\', '\\\\').replace("'", "\\'")
                _window.evaluate_js(f"localStorage.setItem('{safe_key}', '{safe_value}');")

        profile_label = profile_entry.get('name', DEFAULT_PROFILE_NAME)
        profile_gender = _normalize_profile_gender(profile_entry.get('gender'))
        safe_label = profile_label.replace('\\', '\\\\').replace("'", "\\'")
        safe_gender = profile_gender.replace('\\', '\\\\').replace("'", "\\'")
        _window.evaluate_js(f"localStorage.setItem('ct_backup_nome', '{safe_label}');")
        _window.evaluate_js(f"localStorage.setItem('ct_profile_genero', '{safe_gender}');")
        _window.evaluate_js(
            'if (typeof render === "function") render();'
            'if (window.CT && typeof CT.markSavedState === "function") CT.markSavedState();'
        )
        _perfil_carregado = True
    except Exception as exc:
        print(f'[Track Concursos] Erro ao carregar perfil inicial: {exc}')
        _perfil_carregado = True


def on_loaded():
    import threading
    import time

    _window.maximize()

    def delayed_load():
        time.sleep(0.8)
        carregar_perfil_inicial()

    threading.Thread(target=delayed_load, daemon=True).start()


def on_closing():
    global _pode_fechar
    if _pode_fechar:
        return True

    import threading

    threading.Thread(
        target=lambda: _window.evaluate_js(
            'if(typeof mostrarDialogFechamento==="function") mostrarDialogFechamento();'
        ),
        daemon=True,
    ).start()
    return False


class Api:
    def get_latest_release(self):
        try:
            from urllib.request import Request, urlopen

            api_url = f'https://api.github.com/repos/{GITHUB_REPO}/releases/latest'
            request = Request(
                api_url,
                headers={
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': f'Track-Concursos/{APP_VERSION}',
                },
            )

            with urlopen(request, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))

            return {
                'ok': True,
                'version': APP_VERSION,
                'tag_name': data.get('tag_name'),
                'name': data.get('name'),
                'html_url': data.get('html_url') or GITHUB_RELEASES_URL,
                'published_at': data.get('published_at'),
            }
        except Exception as exc:
            return {
                'ok': False,
                'version': APP_VERSION,
                'motivo': str(exc),
            }

    def open_external_url(self, url):
        try:
            parsed = urlparse(str(url or ''))
            if parsed.scheme not in ('http', 'https'):
                raise ValueError('URL externa invalida')
            if parsed.netloc.lower() not in ('github.com', 'www.github.com'):
                raise ValueError('dominio externo nao permitido')

            webbrowser.open(url, new=2)
            return {'ok': True}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def salvar_backup(self, json_str, reason='salvo-manual'):
        try:
            data = json.loads(json_str)
            return _persist_profile_payload(data, reason)
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def salvar_backup_com_nome(self, json_str, nome_sugerido):
        try:
            res = _window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory=os.path.expanduser('~'),
                save_filename=f'{nome_sugerido}.json',
                file_types=('JSON (*.json)',),
            )
            if not res:
                return {'ok': False, 'motivo': 'cancelado'}

            path = res[0] if isinstance(res, (list, tuple)) else res
            if not path.lower().endswith('.json'):
                path += '.json'
            _write_text_atomic(path, json_str)
            return {'ok': True, 'caminho': path}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def selecionar_backup(self):
        try:
            _, _, paths = _ensure_profile_storage()
            result = _window.create_file_dialog(
                webview.OPEN_DIALOG,
                directory=paths['snapshots_dir'],
                allow_multiple=False,
                file_types=('JSON (*.json)',),
            )
            if result and len(result) > 0:
                path = result[0]
                with open(path, 'r', encoding='utf-8') as handle:
                    content = handle.read()
                return {'ok': True, 'conteudo': content, 'caminho': path}
            return {'ok': False, 'motivo': 'cancelado'}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def selecionar_arquivo_json(self, directory=None):
        try:
            start_dir = directory or os.path.expanduser('~')
            if not os.path.isdir(start_dir):
                start_dir = os.path.expanduser('~')
            result = _window.create_file_dialog(
                webview.OPEN_DIALOG,
                directory=start_dir,
                allow_multiple=False,
                file_types=('JSON (*.json)',),
            )
            if result and len(result) > 0:
                path = result[0]
                with open(path, 'r', encoding='utf-8') as handle:
                    content = handle.read()
                return {'ok': True, 'conteudo': content, 'caminho': path}
            return {'ok': False, 'motivo': 'cancelado'}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def restaurar_backup_seguranca(self, path):
        try:
            manifest, profile_entry, paths = _ensure_profile_storage()
            selected_path = os.path.abspath(path)
            snapshots_dir = os.path.abspath(paths['snapshots_dir'])
            if os.path.commonpath([selected_path, snapshots_dir]) != snapshots_dir:
                raise ValueError('o arquivo selecionado não pertence à pasta de backups de segurança do perfil ativo')

            current_payload = _load_profile_payload(paths)
            restored_payload = _load_profile_payload_file(selected_path)

            _save_snapshot(paths, current_payload, 'antes-da-restauracao')
            _write_json_atomic(paths['profile_file'], restored_payload)
            snapshot_path = _save_snapshot(paths, restored_payload, 'restaurado')

            return {
                'ok': True,
                'conteudo': _dump_json(restored_payload),
                'caminho': paths['profile_file'],
                'snapshot': snapshot_path,
                'rotulo': profile_entry.get('name', DEFAULT_PROFILE_NAME),
                'total_snapshots': _count_snapshots(paths),
            }
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def get_profile_info(self):
        try:
            manifest, profile_entry, paths = _ensure_profile_storage()
            return {
                'ok': True,
                'id': profile_entry.get('id', DEFAULT_PROFILE_ID),
                'nome': profile_entry.get('name', DEFAULT_PROFILE_NAME),
                'genero': _normalize_profile_gender(profile_entry.get('gender')),
                'caminho': paths['profile_file'],
                'snapshots_dir': paths['snapshots_dir'],
                'total_snapshots': _count_snapshots(paths),
                'data_dir': DATA_DIR,
            }
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def listar_perfis(self):
        try:
            return _list_profiles()
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def criar_perfil(self, name, gender=None):
        try:
            return {
                'ok': True,
                'perfil': _create_profile(name, gender),
            }
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def trocar_perfil_ativo(self, profile_id):
        try:
            switched = _switch_active_profile(profile_id)
            if _window:
                safe_label = switched.get('nome', DEFAULT_PROFILE_NAME).replace('\\', '\\\\').replace("'", "\\'")
                safe_gender = _normalize_profile_gender(switched.get('genero')).replace('\\', '\\\\').replace("'", "\\'")
                _window.evaluate_js(f"localStorage.setItem('ct_backup_nome', '{safe_label}');")
                _window.evaluate_js(f"localStorage.setItem('ct_profile_genero', '{safe_gender}');")
            return switched
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def atualizar_perfil_ativo(self, new_name=None, gender=None):
        try:
            profile_entry = _update_active_profile(new_name=new_name, gender=gender)
            if _window:
                safe_label = profile_entry.get('name', DEFAULT_PROFILE_NAME).replace('\\', '\\\\').replace("'", "\\'")
                safe_gender = _normalize_profile_gender(profile_entry.get('gender')).replace('\\', '\\\\').replace("'", "\\'")
                _window.evaluate_js(f"localStorage.setItem('ct_backup_nome', '{safe_label}');")
                _window.evaluate_js(f"localStorage.setItem('ct_profile_genero', '{safe_gender}');")
            return {
                'ok': True,
                'id': profile_entry.get('id', DEFAULT_PROFILE_ID),
                'nome': profile_entry.get('name', DEFAULT_PROFILE_NAME),
                'genero': _normalize_profile_gender(profile_entry.get('gender')),
            }
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def renomear_perfil_ativo(self, new_name):
        return self.atualizar_perfil_ativo(new_name=new_name)

    def excluir_perfil(self, profile_id):
        try:
            return _delete_profile(profile_id)
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def definir_backup_atual(self, _path=None):
        info = self.get_profile_info()
        if info.get('ok'):
            return {'ok': True, 'caminho': info['caminho'], 'rotulo': info['nome']}
        return {'ok': False, 'motivo': info.get('motivo', 'perfil_indisponivel')}

    def fecharApp(self):
        global _pode_fechar
        _pode_fechar = True
        _window.destroy()

    def salvar_logo(self, contest_id, base64_data):
        try:
            os.makedirs(LOGOS_DIR, exist_ok=True)

            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]

            img_data = base64.b64decode(base64_data)
            filename = f'{contest_id}.png'
            filepath = os.path.join(LOGOS_DIR, filename)

            with open(filepath, 'wb') as handle:
                handle.write(img_data)

            return {'ok': True, 'path': _path_to_file_url(filepath)}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def get_logo_base64(self, contest_id):
        try:
            logo_path = _find_logo_file(contest_id)
            if logo_path and os.path.exists(logo_path):
                with open(logo_path, 'rb') as handle:
                    return {'ok': True, 'base64': base64.b64encode(handle.read()).decode('utf-8')}
            return {'ok': False}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def salvar_json_concurso(self, nome_arquivo, json_str):
        try:
            result = _window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory=os.path.expanduser('~'),
                save_filename=f'{nome_arquivo}.json',
                file_types=('JSON (*.json)',),
            )
            if not result:
                return {'ok': False, 'motivo': 'cancelado'}

            path = result[0] if isinstance(result, (list, tuple)) else result
            if not path.lower().endswith('.json'):
                path += '.json'

            _write_text_atomic(path, json_str)
            return {'ok': True, 'caminho': path}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def salvar_arquivo_texto(self, nome_arquivo, conteudo, extensao='txt', descricao='Arquivo de texto'):
        try:
            safe_ext = re.sub(r'[^a-zA-Z0-9]+', '', str(extensao or 'txt')).lower() or 'txt'
            base_name = re.sub(r'[<>:"/\\|?*\x00-\x1f]+', '_', str(nome_arquivo or 'arquivo')).strip(' ._')
            base_name = base_name or 'arquivo'
            if not base_name.lower().endswith(f'.{safe_ext}'):
                save_name = f'{base_name}.{safe_ext}'
            else:
                save_name = base_name

            label = str(descricao or 'Arquivo de texto').strip() or 'Arquivo de texto'
            result = _window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory=os.path.expanduser('~'),
                save_filename=save_name,
                file_types=(f'{label} (*.{safe_ext})',),
            )
            if not result:
                return {'ok': False, 'motivo': 'cancelado'}

            path = result[0] if isinstance(result, (list, tuple)) else result
            if not path.lower().endswith(f'.{safe_ext}'):
                path += f'.{safe_ext}'

            _write_text_atomic(path, str(conteudo or ''))
            return {'ok': True, 'caminho': path}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def salvar_jsons_em_lote(self, nome_pasta, arquivos, manifesto_md=None):
        try:
            result = _window.create_file_dialog(
                webview.FOLDER_DIALOG,
                directory=os.path.expanduser('~'),
                allow_multiple=False,
            )
            if not result:
                return {'ok': False, 'motivo': 'cancelado'}

            base_dir = result[0] if isinstance(result, (list, tuple)) else result
            if not base_dir:
                return {'ok': False, 'motivo': 'cancelado'}

            safe_folder = re.sub(r'[^a-zA-Z0-9._-]+', '_', str(nome_pasta or 'lotes_json')).strip('._')
            safe_folder = safe_folder or 'lotes_json'
            target_dir = os.path.join(base_dir, safe_folder)

            suffix = 2
            while os.path.exists(target_dir):
                target_dir = os.path.join(base_dir, f'{safe_folder}_{suffix:02d}')
                suffix += 1

            os.makedirs(target_dir, exist_ok=True)

            saved_files = []
            for item in arquivos or []:
                nome_arquivo = str((item or {}).get('nome_arquivo') or '').strip()
                json_str = (item or {}).get('json_str')
                if not nome_arquivo or not isinstance(json_str, str):
                    continue
                if not nome_arquivo.lower().endswith('.json'):
                    nome_arquivo += '.json'
                file_path = os.path.join(target_dir, nome_arquivo)
                _write_text_atomic(file_path, json_str)
                saved_files.append(file_path)

            if manifesto_md:
                _write_text_atomic(os.path.join(target_dir, 'README_lotes.md'), manifesto_md)

            return {
                'ok': True,
                'pasta': target_dir,
                'arquivos': saved_files,
                'quantidade': len(saved_files),
            }
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}

    def remover_logo(self, contest_id):
        try:
            for ext in ('png', 'jpg', 'jpeg'):
                filepath = os.path.join(LOGOS_DIR, f'{contest_id}.{ext}')
                if os.path.exists(filepath):
                    os.remove(filepath)
            return {'ok': True}
        except Exception as exc:
            return {'ok': False, 'motivo': str(exc)}


def main():
    global _window
    _window = webview.create_window(
        title='Track Concursos',
        url=f'file:///{START_PAGE.replace(os.sep, "/")}',
        width=1440,
        height=860,
        min_size=(900, 600),
        resizable=True,
        text_select=False,
        js_api=Api(),
    )
    _window.events.loaded += on_loaded
    _window.events.closing += on_closing
    webview.start(debug=False)


if __name__ == '__main__':
    main()
