"""Two original seamless instrumental loops; Python standard library only."""
from pathlib import Path
import math, wave, array
root=Path(__file__).resolve().parents[1]
RATE=22050
def render(name,bpm,night):
 beat=60/bpm;duration=32*beat;n=round(duration*RATE);out=[0.0]*n
 def tone(start,midi,length,gain,pad=False):
  freq=440*2**((midi-69)/12)
  for i in range(round(length*RATE)):
   t=i/RATE;u=t/length
   if pad:
    env=math.sin(math.pi*u)**2
    v=math.sin(2*math.pi*freq*t)+.12*math.sin(2*math.pi*freq*2*t)
   else:
    env=(1-math.exp(-t*90))*math.exp(-t*5/length)*(1-u)**.5
    v=math.sin(2*math.pi*freq*t+.5*math.exp(-t*15)*math.sin(2*math.pi*freq*2*t))+.14*math.sin(2*math.pi*freq*3*t)
   out[(round(start*RATE)+i)%n]+=gain*env*v
 progression=[48,53,57,55,48,53,50,55] if not night else [57,53,48,55,57,53,50,55]
 for bar,base in enumerate(progression):
  start=bar*4*beat;third=3 if base in [50,57] else 4
  for interval in [0,third,7]:tone(start,base+12+interval,4.2*beat,.085 if night else .045,True)
  for b in [0,2]:tone(start+b*beat,base-12,1.8*beat,.18,True)
  melody=[12,19,12+third,24,19,12+third,14,19] if not night else [19,24,12+third,19]
  for j,note in enumerate(melody):tone(start+j*(.5 if not night else 1)*beat,base+note,1.5*beat,.16 if night else .22)
  if not night:
   for b in [1,3]:tone(start+b*beat,base+7,.25*beat,.08)
 peak=max(abs(v) for v in out);scale=.58/max(peak,.01)
 pcm=array.array('h',(int(max(-.95,min(.95,v*scale))*32767) for v in out))
 with wave.open(str(root/'assets/audio'/f'{name}.wav'),'wb') as wav:
  wav.setparams((1,2,RATE,0,'NONE','not compressed'));wav.writeframes(pcm.tobytes())
 print(name,round(duration,2),'seconds',len(pcm),'samples')
render('bubble_parade',96,False)
render('moon_pool',72,True)
