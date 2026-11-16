"""Package a locally built UI with a source revision and per-file SHA-256 manifest."""
import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--version', default='3.18.0')
    args = parser.parse_args()
    frontend = Path(__file__).resolve().parent.parent
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=frontend, text=True).strip()
    dirty = subprocess.check_output(['git', 'status', '--porcelain', '--', 'mlflow/server/js'],
                                    cwd=frontend.parents[2], text=True).strip()
    if dirty:
        raise SystemExit('Commit the frontend source before packaging its release.')
    build = args.build.resolve()
    for required in ('index.html', 'asset-manifest.json'):
        if not (build / required).is_file():
            raise SystemExit(f'Missing build file: {required}')
    files = {p.relative_to(build).as_posix(): sha256(p) for p in sorted(build.rglob('*')) if p.is_file()}
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    manifest = {
        'release_id': f'{args.version}-zh-CN-{commit[:12]}-{timestamp}',
        'mlflow_version': args.version,
        'baseline_tag': 'v' + args.version,
        'source_commit': commit,
        'built_utc': timestamp,
        'files': files,
    }
    payload = json.dumps(manifest, indent=2).encode() + b'\n'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(args.output, 'w:gz') as archive:
        for name in files:
            archive.add(build / name, arcname=name, recursive=False)
        entry = tarfile.TarInfo('release-manifest.json')
        entry.size = len(payload)
        entry.mode = 0o644
        archive.addfile(entry, io.BytesIO(payload))
    receipt = {'archive': str(args.output.resolve()), 'sha256': sha256(args.output),
               'release_id': manifest['release_id'], 'source_commit': commit, 'files': len(files)}
    args.output.with_suffix(args.output.suffix + '.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
