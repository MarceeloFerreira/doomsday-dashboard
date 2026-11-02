"""Build the private epic and legendary beast catalog from the validated dictionary."""
import argparse,json,re
from pathlib import Path

def build(source,snapshot=None):
    data=json.loads(Path(source).read_text(encoding='utf-8'))
    if data['metadata']['scan_error_count']!=0:raise ValueError('A source scan with errors cannot be imported')
    rules=json.loads(Path(__file__).with_name('beast-mechanics-rules.json').read_text(encoding='utf-8'))
    scan=Path(snapshot or data['metadata']['scan'])
    tables=json.loads((scan/'tables_current.json').read_text(encoding='utf-8'))
    summary=json.loads((scan/'scan_summary.json').read_text(encoding='utf-8'))
    if summary['manifest']!=data['metadata']['manifest'] or summary['status']!='complete' or summary['errors']:
        raise ValueError('Combat reference must use the same validated snapshot')
    def combat_reference(beast,skills):
        level=max((r for r in tables['gameconfig_pet_level'] if r['Id']==beast['id']),key=lambda r:r['Level'])
        attacks=[]
        periodic=skills['Líder'][:2]
        if [s['slot'] for s in periodic]!=['Líder 1','Líder 2']:raise ValueError('Unexpected leader skill order')
        for skill in periodic:
            text=skill['descriptionEn']
            interval=re.search(r'every (\d+(?:\.\d+)?)\s*(?:s\b|seconds)',text,re.I)
            multiplier=re.search(r'Skill Multiplier:\s*(\d+(?:\.\d+)?)%',text,re.I)
            if not interval or not multiplier:raise ValueError('Missing periodic attack reference')
            initial=text[:multiplier.start()].lower()
            kind='corrosion' if 'corrosion dmg' in initial else 'direct'
            variants={}
            for mode,rule in [('Guarnição',r'(?:When garrisoned|If this Pet is garrisoned),[^.]*?(?:Multiplier to|Multiplier for this attack to) (\d+(?:\.\d+)?)%'),
                              ('Invasão',r'When in a Rally,[^.]*?(?:Multiplier to|Multiplier for this attack to) (\d+(?:\.\d+)?)%')]:
                match=re.search(rule,text,re.I)
                if match:variants[mode]=float(match[1])
            attacks.append({'skillId':skill['id'],'name':skill['name'],'multiplier':float(multiplier[1]),
                'interval':float(interval[1]),'kind':kind,'scenarioMultipliers':variants})
        return {'level':level['Level'],'baseMight':level['Might'],'baseStats':{'attack':level['Atk'],'defense':level['Def'],'hp':level['Hp']},
            'periodicAttacks':attacks,'source':'pet_level / Id + Level; skills_group / Id + Lv'}
    def mechanics(beast,skills):
        roles=rules['beasts'].get(str(beast['id']))
        if not roles:raise ValueError('Missing reviewed mechanics for '+beast['name_pt'])
        output={}
        for role in ['Líder','Suporte']:
            by_id={s['id']:s for s in skills[role]}
            output[role]=[]
            for fact in roles[role]:
                skill=by_id.get(fact['skillId'])
                if not skill or skill['descriptionEn']!=fact['sourceDescription']:
                    raise ValueError('Mechanics need source review: '+str(fact['skillId']))
                output[role].append({k:v for k,v in fact.items() if k!='sourceDescription'})
        return {'version':rules['version'],'roles':output}
    beasts=[]
    for beast in data['beasts']:
        if beast['quality'] not in ('Lendário','Épico'):continue
        skills={role:[] for role in ['Líder','Suporte','Especial']}
        for s in data['beast_skills']:
            if s['entity_id']!=beast['id']:continue
            if s['variant']:raise ValueError('A conditional variant cannot replace an ordinary beast skill')
            skills[s['role']].append({'id':s['record_id'],'groupId':s['raw']['GroupId'],'level':s['level'],
                'slot':s['slot'],'name':s['name_pt'],'description':s['description_pt'],'descriptionEn':s['description_en']})
        for role in skills:
            if len({(s['id'],s['level']) for s in skills[role]})!=len(skills[role]):raise ValueError('Duplicate role skill')
        complete=all(len(skills[r])==count and all(s['description'] for s in skills[r]) for r,count in [('Líder',4),('Suporte',3)])
        beasts.append({'id':beast['id'],'name':beast['name_pt'],'nameEn':beast['name_en'],'rarity':beast['quality'],
            'element':beast['element'],'type':beast['type'],'maxClass':beast['max_class'],'combatReference':combat_reference(beast,skills),'mechanics':mechanics(beast,skills),'complete':complete,'skills':skills})
    beasts.sort(key=lambda b:b['name'].casefold())
    assert beasts and len({b['id'] for b in beasts})==len(beasts)
    meta=data['metadata']
    return {'schemaVersion':1,'asOf':meta['date'],'client':meta['version']['version'],'build':meta['version']['build'],
        'patch':meta['version']['patchversion'],'manifest':meta['manifest'],'beasts':beasts}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('destination');parser.add_argument('--snapshot');args=parser.parse_args()
    result=build(args.source,args.snapshot);target=Path(args.destination);target.parent.mkdir(parents=True,exist_ok=True)
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');temp.replace(target)
    print(f'Imported {len(result["beasts"])} epic and legendary beasts')
