"""Import only legendary heroes from a validated local-client dictionary."""
import argparse,json,re
from pathlib import Path

def build(source):
    data=json.loads(Path(source).read_text(encoding='utf-8'))
    if data['metadata']['scan_error_count']!=0:raise ValueError('Source scan is incomplete')
    heroes=[]
    excluded={'Ataque normal','Contra-ataque','Defesa de torre','Manual'}
    for hero in data['heroes']:
        if hero['quality']!='Lendário':continue
        entries=[s for s in data['hero_skills'] if s['entity_id']==hero['id'] and s['slot'] not in excluded and not s['variant']]
        skills=[];seen=set()
        for s in entries:
            for field in ('description_pt','description_en'):
                if re.search(r'\{\d+\}|\[missing:',s[field]):
                    raise ValueError(f'Unresolved skill text: hero {hero["id"]}, group {s["group_id"]}, {field}')
            key=(s['group_id'],s['slot'])
            if key in seen:continue
            seen.add(key)
            skills.append({'id':s['group_id'],'slot':s['slot'],'name':s['name_pt'],'description':s['description_pt'],
                           'descriptionEn':s['description_en'],'level':s['level']})
        heroes.append({'id':hero['id'],'name':hero['name_pt'],'nameEn':hero['name_en'],'title':hero['title'],
            'troop':hero['troop'],'rarity':'Lendário','tags':hero['tags'],'complete':hero['main_group_coverage']==1,
            'awakeningReplaces':hero['raw'].get('AwakeningSkillsReplace',0),
            'relic':bool(hero.get('relic_id')),'skills':skills})
    heroes.sort(key=lambda h:h['name'].casefold())
    assert heroes and len({h['id'] for h in heroes})==len(heroes)
    return {'schemaVersion':1,'asOf':data['metadata']['date'],'client':data['metadata']['version']['version'],
        'build':data['metadata']['version']['build'],'patch':data['metadata']['version']['patchversion'],
        'manifest':data['metadata']['manifest'],'heroes':heroes}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('destination');args=parser.parse_args()
    result=build(args.source);target=Path(args.destination);target.parent.mkdir(parents=True,exist_ok=True)
    temporary=target.with_suffix('.tmp');temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temporary.replace(target)
    print(f'Imported {len(result["heroes"])} legendary heroes')
