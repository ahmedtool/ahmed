import numpy as np, wave
sr=44100; T=30.0; n=int(sr*T); t=np.arange(n)/sr
out=np.zeros(n)
bpm=110; beat=60/bpm
rng=np.random.default_rng(3)
def add(sig,start):
    i=int(start*sr); j=min(n,i+len(sig)); 
    if i<n: out[i:j]+=sig[:j-i]
# kick
def kick():
    d=0.45; tt=np.arange(int(sr*d))/sr
    f=50+90*np.exp(-tt*28); ph=2*np.pi*np.cumsum(f)/sr
    return np.sin(ph)*np.exp(-tt*7)*0.9
def hat():
    d=0.06; tt=np.arange(int(sr*d))/sr
    x=rng.standard_normal(len(tt)); x=np.diff(x,prepend=0)
    return x*np.exp(-tt*70)*0.08
K=kick(); H=hat()
b=0.0
while b<27.4:
    if b>=1.0: add(K,b)
    add(H,b+beat/2)
    b+=beat
# pad: Am F C G (in Hz) with detuned saws, lowpassed via smoothing
chords=[[220,261.63,329.63],[174.61,220,261.63],[196,261.63,329.63],[196,246.94,293.66]]
bar=beat*4
pad=np.zeros(n)
for k in range(int(T/bar)+1):
    c=chords[k%4]; s0=k*bar; i0=int(s0*sr); i1=min(n,int((s0+bar)*sr))
    if i0>=n: break
    tt=t[i0:i1]-s0
    env=np.minimum(1,tt/0.4)*np.minimum(1,(bar-tt)/0.4)
    sig=sum(np.sin(2*np.pi*f*tt)+0.5*np.sin(2*np.pi*f*1.003*tt)+0.25*np.sin(2*np.pi*f*2*tt) for f in c)
    sig+=0.8*np.sin(2*np.pi*c[0]/2*tt)
    pad[i0:i1]+=sig*env*0.05
out+=pad
# arp pluck
notes=[440,523.25,659.25,523.25]
k=0;s=0.0
while s<27.4:
    f=notes[k%4]*(1 if (k//16)%2==0 else 0.8909)
    d=0.25; tt=np.arange(int(sr*d))/sr
    add(np.sin(2*np.pi*f*tt)*np.exp(-tt*14)*0.06,s); s+=beat/2; k+=1
# whooshes at transitions
def whoosh(d=0.7):
    m=int(sr*d); x=rng.standard_normal(m); tt=np.arange(m)/sr
    env=np.sin(np.pi*tt/d)**2
    # simple moving-average lowpass with sweeping width approximated by mixing
    lp=np.convolve(x,np.ones(30)/30,'same'); hp=x-lp
    mix=(tt/d); y=lp*(1-mix)+hp*mix*0.6
    return y*env*0.35
for bnd in [3.4,7.4,10.6,13.8,17.4,20.6,24.2,27.6]:
    add(whoosh(),bnd-0.38)
# outro impact + shimmer
add(K*1.4,27.6)
d=2.4; tt=np.arange(int(sr*d))/sr
boom=np.sin(2*np.pi*55*tt)*np.exp(-tt*2.2)*0.6
shim=sum(np.sin(2*np.pi*f*tt)*np.exp(-tt*1.4) for f in [880,1318.5,1760,2637])*0.05
add(boom+shim,27.6)
# final long chord
i0=int(27.6*sr); tt=t[i0:]-27.6
out[i0:]+=sum(np.sin(2*np.pi*f*tt) for f in [220,329.63,440,554.37])*0.05*np.exp(-tt*0.8)

import json
def slap(amp):
    d=0.12; m=int(sr*d); tt=np.arange(m)/sr
    x=rng.standard_normal(m); x=x-np.convolve(x,np.ones(6)/6,'same')
    body=np.sin(2*np.pi*(180*np.exp(-tt*30)+90)*tt)
    return (x*0.5+body)*np.exp(-tt*45)*amp
for ti,a in json.load(open('impacts.json')):
    add(slap(0.10 if a<=4 else (0.22 if a>=10 else 0.16)), ti-0.02)
# master
fade=np.ones(n); fo=int(1.0*sr); fade[-fo:]=np.linspace(1,0,fo); fi=int(0.05*sr); fade[:fi]=np.linspace(0,1,fi)
out*=fade; out=np.tanh(out*1.2); out/=np.max(np.abs(out))*1.12
st=np.stack([out,out],1)
with wave.open('music.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes())
print('ok')
