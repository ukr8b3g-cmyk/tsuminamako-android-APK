from pathlib import Path
import hashlib,json,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]
APK=ROOT.parent/'builds/tsuminamako-0.4.16-webtest-debug.apk'
EXTRACT=ROOT/'artifacts/apk-site'
with zipfile.ZipFile(APK) as archive:
 assert archive.testzip() is None
 for info in archive.infolist():
  if not info.filename.startswith('assets/site/') or info.is_dir():continue
  rel=Path(info.filename[len('assets/site/'):]);assert not rel.is_absolute() and '..' not in rel.parts
  target=EXTRACT/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(info))
 for rel in ['browser/game.js','browser/style.css','browser/cards.js','browser/rules.js','browser/i18n.js','browser/locale_catalog.js','browser/trivia_catalog.js']:
  assert (EXTRACT/rel).read_bytes()==(ROOT/rel).read_bytes(),rel
 for directory,pattern in [('assets/audio','*.wav'),('browser/assets','*.webp')]:
  for path in (ROOT/directory).glob(pattern):assert (EXTRACT/path.relative_to(ROOT)).read_bytes()==path.read_bytes(),path
 for card in json.loads((ROOT/'data/card_manifest.json').read_text())['cards']+[json.loads((ROOT/'data/card_manifest.json').read_text())['completion_card']]:
  for field in ['image','image_en']:
   if card.get(field):assert (EXTRACT/card[field]).read_bytes()==(ROOT/card[field]).read_bytes(),card[field]
 assert b'/*NATIVE_LEGACY_DATA*/null' in (EXTRACT/'index.html').read_bytes()
 assert not any(name.startswith('lib/') for name in archive.namelist())
SDK=Path(r'D:\Godot_v4.7.2-stable_win64.exe\AndroidToolchain\sdk\build-tools\36.0.0')
old=Path(r'D:\Codex\_tmp\namako_main_0410\builds\tsuminamako-0.4.14-language-jelly-debug.apk')
def certificate(apk):
 result=subprocess.run([str(SDK/'apksigner.bat'),'verify','--print-certs',str(apk)],capture_output=True,text=True,check=True)
 return next(line.split(': ',1)[1] for line in result.stdout.splitlines() if 'certificate SHA-256 digest:' in line)
assert certificate(old)==certificate(APK)
badging=subprocess.run([str(SDK/'aapt2.exe'),'dump','badging',str(APK)],capture_output=True,text=True,check=True,encoding='utf-8').stdout
assert "name='com.namakotsumi.prototype' versionCode='16' versionName='0.4.16'" in badging
assert "minSdkVersion:'24'" in badging and "targetSdkVersion:'36'" in badging and 'uses-permission:' not in badging
print(json.dumps({'apkBytes':APK.stat().st_size,'sha256':hashlib.sha256(APK.read_bytes()).hexdigest(),'sameCertificateAs0414':True,'certificateSHA256':certificate(APK),'allCardAudioScriptBytes':'PASS','noNativeLibraries':True,'internetPermission':False,'minSdk':24,'targetSdk':36,'extracted':str(EXTRACT)},indent=2))
