"""Build the public browser-only site using only referenced, bounded local files."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT/'artifacts/web'
OUTPUT.mkdir(parents=True, exist_ok=True)
paths = {p.relative_to(ROOT) for p in (ROOT/'browser').glob('*.js')}
paths.update({Path('browser/START.html'),Path('browser/style.css'),Path('assets/professor_gabo.webp')})
paths.update(p.relative_to(ROOT) for p in (ROOT/'browser/assets').glob('*.webp'))
paths.update(p.relative_to(ROOT) for p in (ROOT/'assets/audio').glob('*.wav'))
catalog = json.loads((ROOT/'data/card_manifest.json').read_text(encoding='utf-8'))
for card in catalog['cards']+[catalog['completion_card']]:
    for field in ['image','image_en']:
        if card.get(field):
            paths.add(Path(card[field]))
for rel in paths:
    source = (ROOT/rel).resolve()
    assert source.is_relative_to(ROOT.resolve()) and source.is_file(), rel
    assert source.suffix not in {'.apk','.jks','.keystore'}
    target = OUTPUT/rel
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target)
# Entry at the repository's Pages root; assets resolve from browser/ even on subpaths.
html = (ROOT/'browser/START.html').read_text(encoding='utf-8')
html = html.replace('<head>','<head>\n<base href="browser/">')
(OUTPUT/'index.html').write_text(html,encoding='utf-8',newline='\n')
(OUTPUT/'.nojekyll').write_text('',encoding='utf-8')
assert not list(OUTPUT.rglob('*.apk'))
print(f'Built browser-only site: {len(paths)+2} files; index {len(html.encode())} bytes; no APK or Godot data')
