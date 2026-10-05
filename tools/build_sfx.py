from pathlib import Path
import math, wave, struct
root=Path(__file__).resolve().parents[1]
# Rounded pitch-gliding, major-chord bubbles. No external synthesizer required.
rate=44100
def sound(name, notes, duration):
 samples=[0.0]*int(rate*duration)
 for start,freq,length,gain in notes:
  phase=0.0
  for i in range(int(length*rate)):
   t=i/rate;pos=int(start*rate)+i
   if pos>=len(samples):break
   bend=1+0.30*math.exp(-t*24)*math.cos(t*31)
   phase+=2*math.pi*freq*bend/rate
   env=(1-math.exp(-t*220))*math.exp(-t*6/length)*min(1,(length-t)*100)
   samples[pos]+=gain*env*(math.sin(phase)+.17*math.sin(phase*2)+.06*math.sin(phase*3))
 # Two soft stereo echoes give depth without a long tail.
 peak=max(1,max(abs(x) for x in samples)*1.55)
 with wave.open(str(root/'assets/audio'/f'{name}.wav'),'wb') as out:
  out.setparams((2,2,rate,0,'NONE','not compressed'))
  pcm=bytearray()
  for i,v in enumerate(samples):
   l=(v+(samples[i-5292]*.16 if i>=5292 else 0))/peak
   r=(v+(samples[i-7056]*.13 if i>=7056 else 0))/peak
   pcm.extend(struct.pack('<hh',int(max(-.9,min(.9,l))*32767),int(max(-.9,min(.9,r))*32767)))
  out.writeframes(pcm)
sound('merge',[(0,220,.24,.42),(.09,330,.26,.42),(.18,440,.30,.36),(.30,659.25,.42,.32),(.30,523.25,.42,.22),(.42,880,.32,.13)],.85)
sound('card_pop',[(0,523.25,.45,.65),(.13,659.25,.45,.6),(.26,783.99,.55,.6),(.43,1046.5,.85,.6),(.43,659.25,.85,.35),(.43,783.99,.85,.3)],1.5)
sound('card_rare',[(0,392,.5,.6),(.10,523.25,.5,.6),(.21,659.25,.5,.6),(.32,783.99,.55,.6),(.49,1046.5,.95,.6),(.49,659.25,.95,.4),(.49,783.99,.95,.35),(.69,1567.98,.8,.2),(.83,2093,.65,.13)],1.8)
sound('stick',[(0,330,.30,.5),(.055,494,.28,.3)],.5)
sound('rotate',[(0,480,.16,.38),(.045,640,.15,.22)],.3)
sound('drop',[(0,220,.25,.5),(.045,147,.3,.35)],.45)
sound('click',[(0,660,.13,.3)],.2)
sound('move',[(0,420,.11,.22)],.18)
sound('slip',[(0,392,.2,.4),(.07,294,.2,.3),(.14,196,.22,.25)],.42)
