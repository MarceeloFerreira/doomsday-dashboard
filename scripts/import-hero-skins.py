"""Enrich the private hero catalog using explicit skin -> skill mappings, never variant IDs alone.
Usage: python scripts/import-hero-skins.py VALIDATED_SCAN data/heroes.json
"""
import argparse,functools,json,re
from pathlib import Path

# Client localization uses XXH32 keys over UTF-16LE.
M=0xffffffff
P1=2654435761;P2=2246822519;P3=3266489917;P4=668265263;P5=374761393
def rot(x,n):return ((x<<n)|(x>>(32-n)))&M
@functools.lru_cache(maxsize=300000)
def xxh(s):
 b=s.encode('utf-16-le');n=len(b);i=0
 if n>=16:
  vs=[(P1+P2)&M,P2,0,(-P1)&M]
  while i<=n-16:
   for j in range(4):vs[j]=(rot((vs[j]+int.from_bytes(b[i:i+4],'little')*P2)&M,13)*P1)&M;i+=4
  h=sum(rot(v,n) for v,n in zip(vs,[1,7,12,18]))&M
 else:h=P5
 h=(h+n)&M
 while i<=n-4:h=(rot((h+int.from_bytes(b[i:i+4],'little')*P3)&M,17)*P4)&M;i+=4
 while i<n:h=(rot((h+b[i]*P5)&M,11)*P1)&M;i+=1
 h^=h>>15;h=(h*P2)&M;h^=h>>13;h=(h*P3)&M;h^=h>>16
 return h

def resolve(mapping,key,seen=()):
    if key in seen or len(seen)>=12:raise ValueError('Cyclic localization '+key)
    parts=mapping.get(str(xxh(key)),mapping.get(key))
    if parts is None:raise ValueError('Missing localization '+key)
    return ''.join(resolve(mapping,p['param'],(*seen,key)) if p['text']=='ref' else
        ('{'+str(p['index'])+'}' if p['index'] and p['text'] in ('text','value') else p['text']) for p in parts)

def build(scan,catalog):
    scan=Path(scan)
    load=lambda name:json.loads((scan/name).read_text(encoding='utf-8'))
    summary=load('scan_summary.json')
    if summary['status']!='complete' or summary['errors']:raise ValueError('A complete, validated scan is required')
    tables=load('tables_current.json');parts=load('string_parts.json')
    def loc(ref,lang):
        text=resolve(parts[lang],ref[0])
        if not text:raise ValueError('Missing localization '+ref[0])
        for i,arg in enumerate(ref[1:],1):text=text.replace('{'+str(i)+'}',str(arg))
        text=re.sub(r'\[(?:/?(?:b|i|u)|/?color(?:=[^\]]*)?)\]|<[^>]+>','',text,flags=re.I)
        text=re.sub(r'\s+',' ',text.replace('\\n',' ')).strip()
        if re.search(r'\{\d+\}|\[missing:',text):raise ValueError('Unresolved text '+text)
        return text
    # Explicitly supported skin. Other variants may be relics or unrelated systems.
    hero=next(h for h in catalog['heroes'] if h['id']==1095)
    skin=next(s for s in tables['gameconfig_hero_skin'] if s['Id']==109501 and s['HeroId']==hero['id'])
    skills=[]
    for mapping in skin['SkillsGroup']:
        original,replacement=mapping['Data']
        base=next(s for s in hero['skills'] if s['id']==original and s['slot']!='Substituição do despertar')
        rows=[s for s in tables['gameconfig_skills_group'] if s['Id']==replacement]
        if not rows:raise ValueError('Missing replacement skill '+str(replacement))
        row=max(rows,key=lambda s:s['Lv'])
        skills.append(dict(id=replacement,replaces=original,slot=base['slot'],name=loc(row['NameKey'],'pt'),
            description=loc(row['DesKey'],'pt'),descriptionEn=loc(row['DesKey'],'en'),level=row['Lv']))
    if len(skills)!=3:raise ValueError('Unexpected Miyamoto skin mapping')
    sources=[dict(table=f['name'],sha256=f['sha256']) for f in load('inventory.json')['files']
        if f['name'] in ['gameconfig_hero_skin','gameconfig_skills_group','gameconfig_string_fix','gameconfig_string_pt','gameconfig_string_en']]
    hero['skins']=[dict(id=skin['Id'],name=loc(skin['HeroTitleKey'],'pt'),skills=skills,
        evidence=dict(asOf=summary['generatedAt'][:10],client=summary['version']['version'],build=summary['version']['build'],
            patch=summary['version']['patchversion'],manifest=summary['manifest'],manifestSha256=summary['manifestSha256'],sources=sources))]
    return catalog

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('scan');p.add_argument('catalog');args=p.parse_args()
    path=Path(args.catalog);data=build(args.scan,json.loads(path.read_text(encoding='utf-8')))
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
