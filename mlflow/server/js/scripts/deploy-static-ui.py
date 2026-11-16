"""Install a verified static UI release using MLflow's existing Python environment.

Run with the server venv's Python. No package install, service restart, authentication
change, database access or artifact access is performed. Linux renameat2 provides the
atomic first transition from the wheel's build directory to a release symlink.
"""
import argparse
import ctypes
from datetime import datetime, timezone
import fcntl
import hashlib
from html.parser import HTMLParser
from importlib import metadata, util
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile
from urllib.request import urlopen
from urllib.parse import urljoin, urlsplit


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def atomic_switch(target, destination, releases):
    replacement = target.with_name('build.ui-next')
    if replacement.exists() or replacement.is_symlink():
        raise RuntimeError(f'Unfinished previous swap: {replacement}')
    replacement.symlink_to(destination, target_is_directory=True)
    if target.is_symlink():
        previous = target.resolve()
        os.replace(replacement, target)
        return previous
    previous = releases / ('official-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    if target.stat().st_dev != releases.stat().st_dev:
        replacement.unlink()
        raise RuntimeError('Atomic directory exchange requires the same filesystem.')
    libc = ctypes.CDLL(None, use_errno=True)
    renameat2 = libc.renameat2
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int
    if renameat2(-100, os.fsencode(target), -100, os.fsencode(replacement), 2) != 0:
        error = ctypes.get_errno()
        replacement.unlink()
        raise OSError(error, os.strerror(error))
    try:
        os.rename(replacement, previous)
    except BaseException:
        renameat2(-100, os.fsencode(target), -100, os.fsencode(replacement), 2)
        replacement.unlink()
        raise
    return previous


class AssetReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        value = values.get('src') if tag == 'script' else values.get('href') if tag == 'link' else None
        if value:
            self.references.append(value)


def check_http(base, release):
    expected = AssetReferences()
    expected.feed((release / 'index.html').read_text())
    names = []
    for reference in expected.references:
        name = urlsplit(reference).path.removeprefix('./').removeprefix('/').removeprefix('static-files/')
        if name.startswith(('static/js/main.', 'static/css/main.')):
            names.append(name)
    if not any(name.endswith('.js') for name in names) or not any(name.endswith('.css') for name in names):
        raise RuntimeError('Build index does not reference its main JavaScript and CSS assets.')
    with urlopen(base.rstrip('/') + '/', timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f'Index HTTP status: {response.status}')
        observed = AssetReferences()
        observed.feed(response.read().decode('utf-8'))
    verified = []
    for name in names:
        matches = [ref for ref in observed.references if urlsplit(ref).path.endswith('/' + name)]
        if not matches:
            raise RuntimeError(f'HTTP index does not reference the expected build asset: {name}')
        endpoint = urljoin(base.rstrip('/') + '/', matches[0])
        if urlsplit(endpoint).netloc != urlsplit(base).netloc:
            raise RuntimeError(f'Unexpected asset host: {endpoint}')
        with urlopen(endpoint, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError(f'Asset HTTP status: {response.status}')
            digest = hashlib.sha256(response.read()).hexdigest()
        if digest != sha256(release / name):
            raise RuntimeError(f'HTTP checksum mismatch: {name}')
        verified.append(name)
    return {'index_status': 200, 'expected_build_references': True, 'sha256_verified_assets': verified}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--sha256')
    parser.add_argument('--releases', type=Path, required=True)
    parser.add_argument('--health-url', required=True)
    parser.add_argument('--service')
    parser.add_argument('--rollback', type=Path, help='Deployment receipt whose previous release should be restored')
    args = parser.parse_args()
    version = metadata.version('mlflow')
    package = Path(next(iter(util.find_spec('mlflow').submodule_search_locations)))
    target = package / 'server/js/build'
    if not (target / 'index.html').is_file():
        raise RuntimeError(f'Installed static build not found: {target}')
    releases = args.releases.resolve()
    releases.mkdir(parents=True, exist_ok=True)
    with (releases / '.deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        pid = subprocess.check_output(['systemctl', 'show', args.service, '-p', 'MainPID', '--value'], text=True).strip() if args.service else None
        if args.rollback:
            receipt = json.loads(args.rollback.read_text())
            destination = Path(receipt['previous']).resolve()
            if not destination.is_relative_to(releases) or not (destination / 'index.html').is_file():
                raise RuntimeError('Rollback release is not present under the releases directory.')
            previous = atomic_switch(target, destination, releases)
            try:
                check_http(args.health_url, destination)
            except BaseException:
                atomic_switch(target, previous, releases)
                raise
            print(json.dumps({'rolled_back_to': str(destination), 'replaced': str(previous), 'pid': pid}))
            return
        if not args.archive or not args.sha256 or sha256(args.archive) != args.sha256:
            raise RuntimeError('Archive SHA-256 verification failed.')
        with tempfile.TemporaryDirectory(prefix='.extract-', dir=releases) as staging_name:
            staging = Path(staging_name)
            with tarfile.open(args.archive, 'r:gz') as archive:
                for entry in archive.getmembers():
                    path = PurePosixPath(entry.name)
                    if path.is_absolute() or '..' in path.parts or not (entry.isfile() or entry.isdir()):
                        raise RuntimeError(f'Unsupported archive entry: {entry.name}')
                archive.extractall(staging, filter='data')
            manifest = json.loads((staging / 'release-manifest.json').read_text())
            if manifest['mlflow_version'] != version:
                raise RuntimeError(f'UI/server version mismatch: {manifest["mlflow_version"]} vs {version}')
            actual = {p.relative_to(staging).as_posix() for p in staging.rglob('*') if p.is_file()} - {'release-manifest.json'}
            if actual != set(manifest['files']):
                raise RuntimeError('Build file inventory mismatch.')
            for name, expected in manifest['files'].items():
                if sha256(staging / name) != expected:
                    raise RuntimeError(f'Build file checksum mismatch: {name}')
            assets = json.loads((staging / 'asset-manifest.json').read_text())
            for resource in assets['files'].values():
                relative = resource.removeprefix('./')
                if relative.startswith('/static-files/'):
                    relative = relative.removeprefix('/static-files/')
                else:
                    relative = relative.removeprefix('static-files/')
                if relative.startswith('/') or '..' in PurePosixPath(relative).parts or not (staging / relative).is_file():
                    raise RuntimeError(f'Unsupported static asset layout: {resource}')
            release_id = manifest['release_id']
            if Path(release_id).name != release_id or not release_id.startswith(version + '-zh-CN-'):
                raise RuntimeError('Invalid release identifier.')
            destination = releases / release_id
            if destination.exists():
                raise RuntimeError(f'Release already exists: {destination}')
            # Preserve old content-addressed chunks for tabs opened before the swap.
            carried = 0
            for old in target.rglob('*'):
                if old.is_file():
                    relative = old.relative_to(target)
                    new = staging / relative
                    if (relative.parts[0] in ('static', 'lib') or old.name.endswith('.worker.js')) and not new.exists():
                        new.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(old, new)
                        carried += 1
            # TemporaryDirectory starts at 0700; static assets must be readable by
            # the existing unprivileged MLflow service after the atomic switch.
            staging.chmod(0o755)
            for path in staging.rglob('*'):
                path.chmod(0o755 if path.is_dir() else 0o644)
            shutil.copytree(staging, destination)
            if args.service:
                user = subprocess.check_output(
                    ['systemctl', 'show', args.service, '-p', 'User', '--value'], text=True
                ).strip()
                if user:
                    subprocess.run(['runuser', '-u', user, '--', 'test', '-r', str(destination / 'index.html')], check=True)
        previous = atomic_switch(target, destination, releases)
        try:
            http_checks = check_http(args.health_url, destination)
            if args.service:
                current_pid = subprocess.check_output(['systemctl', 'show', args.service, '-p', 'MainPID', '--value'], text=True).strip()
                if current_pid != pid:
                    raise RuntimeError('Backend PID changed during the static deployment.')
        except BaseException:
            atomic_switch(target, previous, releases)
            raise
        receipt = {'current': str(destination), 'previous': str(previous), 'installed_path': str(target),
                   'source_commit': manifest['source_commit'], 'archive_sha256': args.sha256,
                   'index_sha256': sha256(destination / 'index.html'), 'verified_files': len(manifest['files']),
                   'carried_compatibility_files': carried, 'mlflow_version': version, 'pid': pid,
                   'health_url': args.health_url, 'http_checks': http_checks, 'restarted': False}
        (destination / 'deployment-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
