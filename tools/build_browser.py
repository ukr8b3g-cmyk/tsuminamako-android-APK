"""Build the optional standalone HTML preview. Python standard library only.
Run from any directory: python tools/build_browser.py
No downloads, network access, or package installation.
"""
from pathlib import Path
import base64
import copy
import json

root = Path(__file__).resolve().parents[1]
html = (root / 'browser' / 'START.html').read_text(encoding='utf-8')
css = (root / 'browser' / 'style.css').read_text(encoding='utf-8')
css = css.replace('assets/lcd_metal.png', 'data:image/png;base64,' + base64.b64encode((root / 'browser/assets/lcd_metal.png').read_bytes()).decode('ascii'))
english = json.loads((root / 'browser' / 'locales' / 'en.json').read_text(encoding='utf-8'))
(root / 'browser' / 'locale_catalog.js').write_text('window.NAMAKO_EN=' + json.dumps(english, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')

catalog = json.loads((root / 'data' / 'card_manifest.json').read_text(encoding='utf-8'))
lore = json.loads((root / 'browser' / 'lore_100_v2_1.json').read_text(encoding='utf-8'))
trivia = {
    'dataset': 'ツミナマコ研究手帖100',
    'version': lore['version'],
    'language': 'ja',
    'notice': lore['notice'],
    'episodes': lore['entries'],
}
(root / 'browser' / 'trivia_catalog.js').write_text('window.NAMAKO_TRIVIA_CATALOG=' + json.dumps(trivia, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
portrait = root / 'assets' / 'professor_gabo.webp'
html = html.replace('../assets/professor_gabo.webp', 'data:image/webp;base64,' + base64.b64encode(portrait.read_bytes()).decode('ascii'))
for name in ('trivia_professor.png', 'trivia_korisuke.png', 'trivia_corinpre.png', 'trivia_professor_en.png', 'trivia_korisuke_en.png', 'trivia_corinpre_en.png'):
    asset = root / 'browser' / 'assets' / name
    html = html.replace('assets/' + name, 'data:image/png;base64,' + base64.b64encode(asset.read_bytes()).decode('ascii'))
# browser/START.html lives one directory below the project root.
browser_catalog = copy.deepcopy(catalog)
for card in browser_catalog.get('cards', []) + [browser_catalog.get('completion_card', {})]:
    image = str(card.get('image', ''))
    if image:
        card['image'] = '../' + image
    if card.get('image_en'):
        card['image_en'] = '../' + card['image_en']
(root / 'browser' / 'card_catalog.js').write_text(
    'window.NAMAKO_CARD_CATALOG=' + json.dumps(browser_catalog, ensure_ascii=False, separators=(',', ':')) + ';\n',
    encoding='utf-8'
)

# Root START.html stays self-contained. If card artwork is added later, existing
# PNG/WebP/JPEG files are embedded automatically as image_data data URIs.
standalone_catalog = copy.deepcopy(catalog)
for card in standalone_catalog.get('cards', []) + [standalone_catalog.get('completion_card', {})]:
    rel = str(card.get('image', ''))
    if not rel:
        continue
    path = root / rel
    if not path.is_file():
        continue
    ext = path.suffix.lower()
    mime = {'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg'}.get(ext)
    if mime:
        card['image_data'] = f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

for card in standalone_catalog.get('cards', []) + [standalone_catalog.get('completion_card', {})]:
    rel = card.get('image_en')
    if rel:
        path = root / rel
        assert path.is_file(), path
        mime = 'image/png' if path.suffix.lower() == '.png' else 'image/webp'
        card['image_data_en'] = f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

audio = {p.stem: 'data:audio/wav;base64,' + base64.b64encode(p.read_bytes()).decode('ascii')
         for p in sorted((root / 'assets' / 'audio').glob('*.wav'))}
scripts = '<script>window.NAMAKO_AUDIO=' + json.dumps(audio, separators=(',', ':')) + ';</script>\n'
scripts += '<script>window.NAMAKO_CARD_CATALOG=' + json.dumps(standalone_catalog, ensure_ascii=False, separators=(',', ':')) + ';</script>\n'
scripts += '<script>window.NAMAKO_TRIVIA_CATALOG=' + json.dumps(trivia, ensure_ascii=False, separators=(',', ':')) + ';</script>\n'
scripts += '<script>window.NAMAKO_EN=' + json.dumps(english, ensure_ascii=False, separators=(',', ':')) + ';</script>\n'
for name in ['i18n.js', 'trivia.js', 'cards.js', 'rules.js', 'rewards.js', 'session.js', 'game.js']:
    source = (root / 'browser' / name).read_text(encoding='utf-8')
    scripts += '<script>\n' + source.replace('</script', '<\\/script') + '\n</script>\n'
html = html.replace('<script src="card_catalog.js"></script><script src="trivia_catalog.js"></script><script src="locale_catalog.js"></script><script src="i18n.js"></script><script src="trivia.js"></script><script src="cards.js"></script><script src="rules.js"></script><script src="rewards.js"></script><script src="session.js"></script><script src="game.js"></script>', scripts)
(root / 'START.html').write_text(html, encoding='utf-8')
print('Created START.html (self-contained: scripts, graphics, audio; card art auto-embeds when supplied)')
