"""Build lightweight previews; preserve all original runtime/card artwork.

Requires Pillow. Only derived browser WebP files and card thumbnails are written.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for source in (ROOT/'cards/images').rglob('*.webp'):
    target = ROOT/'cards/thumbs'/source.relative_to(ROOT/'cards/images')
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.thumbnail((320, 480), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=90, method=6)
for source in (ROOT/'assets/trivia').glob('*.png'):
    target = ROOT/'browser/assets'/source.with_suffix('.webp').name
    with Image.open(source) as image:
        image.save(target, 'WEBP', quality=92, method=6)
with Image.open(ROOT/'assets/lcd_metal.png') as image:
    image.thumbnail((768, 768), Image.Resampling.LANCZOS)
    image.save(ROOT/'browser/assets/lcd_metal.webp', 'WEBP', quality=92, method=6)
print('Derived previews updated; full-size original card images retained')
