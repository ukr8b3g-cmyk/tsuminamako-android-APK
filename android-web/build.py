"""Build an offline WebView APK from the verified public test sources; no downloads."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,zipfile
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
parser=argparse.ArgumentParser()
parser.add_argument('--sdk',default=r'D:\Godot_v4.7.2-stable_win64.exe\AndroidToolchain\sdk')
parser.add_argument('--jdk',default=r'D:\Godot_v4.7.2-stable_win64.exe\AndroidToolchain\jdk-17.0.20.1+1')
parser.add_argument('--keystore',default=str(Path.home()/'AppData/Roaming/Godot/keystores/debug.keystore'))
args=parser.parse_args()
sdk,jdk=Path(args.sdk),Path(args.jdk)
tools=sdk/'build-tools/36.0.0';platform=sdk/'platforms/android-36/android.jar'
env=os.environ.copy();env['JAVA_HOME']=str(jdk);env['PATH']=str(jdk/'bin')+os.pathsep+env['PATH']
# Existing local debug key; never copy it into source/artifacts or print its password.
env.setdefault('NAMAKO_KEYSTORE_PASSWORD','android')
def run(command):subprocess.run([str(x) for x in command],env=env,check=True,cwd=ROOT)
work=HERE/'.build';classes=work/'classes';assets=work/'assets';resources=work/'res';dex=work/'dex'
for directory in [classes,assets,resources,dex]:directory.mkdir(parents=True,exist_ok=True)
run(['python',ROOT/'tools/build_web_site.py'])
site=assets/'site';shutil.copytree(ROOT/'artifacts/web',site,dirs_exist_ok=True)
for name in ['android_host.js','android_migrate.js']:shutil.copy2(HERE/name,site/'browser'/name)
entry=site/'index.html';html=entry.read_text(encoding='utf-8')
html=html.replace('<script src="card_catalog.js', '<script>window.NAMAKO_LEGACY=/*NATIVE_LEGACY_DATA*/null;</script><script src="android_migrate.js"></script><script src="card_catalog.js',1)
html=html.replace('</body>','<script src="android_host.js"></script>\n</body>')
entry.write_text(html,encoding='utf-8',newline='\n')
record_path=ROOT.parent/'SOURCE_RECORD.json'
record=json.loads(record_path.read_text()) if record_path.is_file() else {'commit':os.environ.get('NAMAKO_SOURCE_COMMIT','local source'),'tree':os.environ.get('NAMAKO_SOURCE_TREE','local tree')}
(site/'WEB_SOURCE.json').write_text(json.dumps({'commit':record['commit'],'tree':record['tree'],'version':'0.4.16','engine':'Android System WebView; bundled offline content'},indent=2),encoding='utf-8')
shutil.copytree(HERE/'res',resources,dirs_exist_ok=True)
(resources/'drawable').mkdir(exist_ok=True);shutil.copy2(ROOT/'assets/icon.png',resources/'drawable/ic_launcher.png')
compiled=work/'resources.zip';unsigned=work/'unsigned.apk';aligned=work/'aligned.apk'
run([tools/'aapt2.exe','compile','--dir',resources,'-o',compiled])
run([tools/'aapt2.exe','link','-o',unsigned,'-I',platform,'--manifest',HERE/'AndroidManifest.xml',compiled,'-A',assets,'-0','wav','-0','webp','--min-sdk-version','24','--target-sdk-version','36','--version-code','16','--version-name','0.4.16'])
java=sorted((HERE/'java').rglob('*.java'))
run([jdk/'bin/javac.exe','--release','8','-encoding','UTF-8','-classpath',platform,'-d',classes,*java])
run([tools/'d8.bat','--min-api','24','--lib',platform,'--output',dex,*sorted(classes.rglob('*.class'))])
# Rewrite ZIP headers consistently before adding DEX; preserve every resource byte.
normalized=work/'unsigned-normal.apk'
with zipfile.ZipFile(unsigned) as original,zipfile.ZipFile(normalized,'w') as archive:
 for info in original.infolist():archive.writestr(info.filename,original.read(info),compress_type=info.compress_type)
 archive.write(dex/'classes.dex','classes.dex',compress_type=zipfile.ZIP_STORED)
run([tools/'zipalign.exe','-P','16','-f','4',normalized,aligned])
output=ROOT.parent/'builds';output.mkdir(exist_ok=True)
apk=output/'tsuminamako-0.4.16-webtest-debug.apk'
run([tools/'apksigner.bat','sign','--ks',args.keystore,'--ks-pass','env:NAMAKO_KEYSTORE_PASSWORD','--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--v4-signing-enabled','false','--out',apk,aligned])
run([tools/'apksigner.bat','verify','--verbose','--print-certs',apk])
run([tools/'zipalign.exe','-c','-P','16','4',apk])
with zipfile.ZipFile(apk) as archive:
 assert archive.testzip() is None
 for source in site.rglob('*'):
  if source.is_file() and not any(part.startswith('.') for part in source.relative_to(site).parts):assert archive.read('assets/site/'+source.relative_to(site).as_posix())==source.read_bytes(),source
 assert not any(name.startswith('lib/') for name in archive.namelist())
sha=hashlib.sha256(apk.read_bytes()).hexdigest()
(output/'SHA256SUMS-0.4.16-webtest.txt').write_text(f'{sha}  {apk.name}\n',encoding='utf-8')
report={'apk':str(apk),'bytes':apk.stat().st_size,'sha256':sha,'sourceCommit':record['commit'],'siteFiles':sum(p.is_file() and not any(part.startswith('.') for part in p.relative_to(site).parts) for p in site.rglob('*')),'signature':'v2/v3; existing local debug key','zipalign':'PASS 16 KB','assetReadback':'PASS byte-for-byte'}
(output/'BUILD_VERIFICATION.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
