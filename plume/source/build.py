"""Reconstruit plume/plume-compagnon.js : python3 plume/source/build.py plume/plume-compagnon.js
(les répliques communes = tous les mp3 de plume/voix/)"""
import json,re,sys
import os
ICI=os.path.dirname(os.path.abspath(__file__))
cal=json.load(open(os.path.join(ICI,'plume-cal.json')))
v=open(os.path.join(ICI,'visage.svg')).read()
for d in ['gJoue','flou2','flou3','flou8']:
    v=v.replace('id="%s"'%d,'id="pc-%s"'%d).replace('url(#%s)'%d,'url(#pc-%s)'%d)
v=v.replace('id="visage"','class="pc-visage"')
for c in ['bouche','boucheOuverte','levres','moustaches','yeuxHeureux','yeuxFermes']:
    v=v.replace('id="%s"'%c,'class="pc-%s"'%c)
v=re.sub(r'(class="pc-boucheOuverte") style="[^"]*"',r'\1',v)
commun={os.path.basename(f)[:-4]:1 for f in __import__('glob').glob(os.path.join(ICI,'..','voix','*.mp3'))}
src=open(os.path.join(ICI,'plume-src.js'),encoding='utf-8').read()
src=src.replace('__CAL__',json.dumps(cal,separators=(',',':'))).replace('__VISAGE__',json.dumps(v)).replace('__COMMUN__',json.dumps({k:1 for k in commun}))
src=''.join(c if ord(c)<128 else ('\\u%04x'%ord(c) if ord(c)<0x10000 else '\\u%04x\\u%04x'%(0xD800+((ord(c)-0x10000)>>10),0xDC00+((ord(c)-0x10000)&0x3FF))) for c in src)
open(sys.argv[1],'w',encoding='ascii').write(src); print(len(src))
