"""Generate honest source hashes and hashes of artifacts actually present.

No test PASS status is inferred. Run tests separately and retain their reports.
Usage: python tools/update_build_metadata.py [--check]
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
parser.add_argument('--artifacts', action='store_true', help='Include locally built release artifacts; not for source-only commits')
args = parser.parse_args()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
version = re.search(r'config/version="([^"]+)"', (ROOT/'project.godot').read_text()).group(1)
paths = []
for p in ROOT.rglob('*'):
    if not p.is_file() or '__pycache__' in p.parts:
        continue
    rel = p.relative_to(ROOT)
    if (any(x.startswith('.') for x in rel.parts) and str(rel) not in {'.gitignore', '.gitattributes'} and rel.parts[0] != '.github') or rel.parts[0] in {'builds', 'artifacts', 'node_modules', '__pycache__'}:
        continue
    if p.name in {'BUILD_MANIFEST.json', 'SHA256SUMS.txt', 'START.html'} and len(rel.parts) == 1:
        continue
    if p.suffix in {'.log', '.cfg'} and rel.parts[0] == 'tests':
        continue
    if rel.parts[0] == 'tests' and (p.suffix in {'.png', '.import', '.uid'} or '_results' in p.name or any('validation' in part for part in rel.parts)):
        continue
    paths.append(p)
files = {str(p.relative_to(ROOT)).replace('\\','/'): sha(p) for p in sorted(paths)}
artifacts = [ROOT/'START.html'] + sorted((ROOT/'builds').glob('*.apk')) + sorted((ROOT/'builds').glob('*.aab'))
artifacts = [p for p in artifacts if p.is_file()] if args.artifacts else []
manifest = {
    'version': version,
    'sourceBaseline': '099b6c8ce80e05411f9840c0ebb1f5eb375a2d88',
    'hashAlgorithm': 'SHA-256',
    'files': files,
    'artifacts': {str(p.relative_to(ROOT)).replace('\\','/'): {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in artifacts},
    'verification': 'See TEST_REPORT_JA.md; hash generation does not certify tests or Android device compatibility.',
    'distribution': 'Development sources; a debug APK is not a Google Play release.',
}
outputs = {
    ROOT/'BUILD_MANIFEST.json': json.dumps(manifest, ensure_ascii=False, indent=2)+'\n',
    ROOT/'SHA256SUMS.txt': ''.join(f'{digest}  {name}\n' for name, digest in files.items()) + ''.join(f'{sha(p)}  {p.relative_to(ROOT).as_posix()}\n' for p in artifacts),
}
for p, text in outputs.items():
    if args.check:
        if not p.exists() or p.read_text() != text:
            raise SystemExit(f'Stale metadata: {p.name}; run tools/update_build_metadata.py')
    else:
        p.write_text(text, encoding='utf-8', newline='\n')
print(f'{"Verified" if args.check else "Updated"} {len(files)} source hashes and {len(artifacts)} artifact hashes')
