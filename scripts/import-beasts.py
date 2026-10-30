"""Build the private legendary beast catalog from the validated dictionary."""
import argparse,json
from pathlib import Path

def build(source):
    data=json.loads(Path(source).read_text(encoding='utf-8'))
    if data['metadata']['scan_error_count']!=0:raise ValueError('A source scan with errors cannot be imported')
    beasts=[]
    for beast in data['beasts']:
        if beast['quality']!='Lendário':continue
        skills={role:[] for role in ['Líder','Suporte','Especial']}
        for s in data['beast_skills']:
            if s['entity_id']!=beast['id']:continue
            if s['variant']:raise ValueError('A conditional variant cannot replace an ordinary beast skill')
            skills[s['role']].append({'id':s['record_id'],'groupId':s['raw']['GroupId'],'level':s['level'],
                'slot':s['slot'],'name':s['name_pt'],'description':s['description_pt'],'descriptionEn':s['description_en']})
        for role in skills:
            if len({(s['id'],s['level']) for s in skills[role]})!=len(skills[role]):raise ValueError('Duplicate role skill')
        complete=all(len(skills[r])==count and all(s['description'] for s in skills[r]) for r,count in [('Líder',4),('Suporte',3)])
        beasts.append({'id':beast['id'],'name':beast['name_pt'],'nameEn':beast['name_en'],'rarity':'Lendário',
            'element':beast['element'],'type':beast['type'],'maxClass':beast['max_class'],'complete':complete,'skills':skills})
    beasts.sort(key=lambda b:b['name'].casefold())
    assert beasts and len({b['id'] for b in beasts})==len(beasts)
    meta=data['metadata']
    return {'schemaVersion':1,'asOf':meta['date'],'client':meta['version']['version'],'build':meta['version']['build'],
        'patch':meta['version']['patchversion'],'manifest':meta['manifest'],'beasts':beasts}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('destination');args=parser.parse_args()
    result=build(args.source);target=Path(args.destination);target.parent.mkdir(parents=True,exist_ok=True)
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(target)
    print(f'Imported {len(result["beasts"])} legendary beasts')
