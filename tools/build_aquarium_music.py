"""Original quiet aquarium loop, including soft pump bubbles. No dependencies."""
from pathlib import Path
import math, array, wave, random
RATE=22050
DURATION=32
out=[0.0]*(RATE*DURATION)
def add(start, length, sample):
 for i in range(int(length*RATE)):
  t=i/RATE
  out[(round(start*RATE)+i)%len(out)]+=sample(t,t/length)
for bar,base in enumerate([48,53,57,55]):
 for semitone in [0,3 if base==57 else 4,7,14]:
  hz=440*2**((base+semitone-69)/12)
  add(bar*8,10,lambda t,u,f=hz:.055*math.sin(math.pi*u)**2*(math.sin(2*math.pi*f*t)+.12*math.sin(4*math.pi*f*t)))
 for beat,note in [(1,19),(4,24),(6,14)]:
  hz=440*2**((base+note-69)/12)
  add(bar*8+beat,3,lambda t,u,f=hz:.065*(1-math.exp(-t*35))*math.exp(-t*2)*(1-u)*math.sin(2*math.pi*f*t))
rng=random.Random(812)
for i in range(48):
 start=i*2/3+rng.uniform(-.07,.07);f=rng.uniform(240,420)
 # Smooth descending pitch gives the hollow, soft "pok" of an air stone.
 add(start,.22,lambda t,u,f=f:.12*math.sin(math.pi*u)**2*math.exp(-u*3)*math.sin(2*math.pi*(f*t+75*.025*(1-math.exp(-t/.025)))))
peak=max(map(abs,out));gain=.46/peak
pcm=array.array('h',(round(v*gain*32767) for v in out))
path=Path(__file__).resolve().parents[1]/'assets/audio/aquarium_air.wav'
with wave.open(str(path),'wb') as w:
 w.setparams((1,2,RATE,0,'NONE','not compressed'));w.writeframes(pcm.tobytes())
print(f'{path.name}: {DURATION}s, peak={max(map(abs,pcm))/32767:.3f}, loop edge jump={abs(pcm[0]-pcm[-1])}')
