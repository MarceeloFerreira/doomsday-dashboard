"""Import beast chips from a validated client snapshot using the scanner helpers."""
import argparse, hashlib, json, re, sys
from pathlib import Path

def build(snapshot,scanner_root):
    sys.path.insert(0,str(scanner_root))
    from scan_game_content import read_json,normalize_parts,resolve
    snapshot=Path(snapshot);summary=read_json(snapshot/'scan_summary.json')
    if summary['status']!='complete' or summary['errors']:raise ValueError('Source scan must be complete without errors')
    tables=read_json(snapshot/'tables_current.json')
    strings={lang:normalize_parts(parts) for lang,parts in read_json(snapshot/'string_parts.json').items() if lang in ['pt','en']}
    def loc(ref,lang='pt'):
        if not ref or ref==['null']:return ''
        text=resolve(strings[lang],ref[0])
        for n,arg in enumerate(ref[1:],1):text=text.replace('{'+str(n)+'}',str(arg))
        text=re.sub(r'<[^>]+>|\[/?(?:color[^\]]*|b|i|u)\]','',text)
        text=re.sub(r'\s+',' ',text.replace('\\n',' ')).strip()
        if re.search(r'\{\d+\}|\[missing:|\[cycle:',text):raise ValueError('Unresolved text: '+text)
        return text
    rows=lambda k:tables['gameconfig_'+k]
    basic=rows('pet_chips_basic');suits=rows('pet_chips_suit');stars=rows('pet_chips_star')
    skills={(r['Id'],r['Lv']):r for r in rows('skills_group')}
    buffs={r['BuffId']:r for r in rows('buff')};types={r['BuffType']:r for r in rows('buff_type')}
    def attributes(ids):
        output=[]
        for bid in ids:
            b=buffs[bid];bt=types[b['BuffType']]
            output.append({'id':bid,'type':b['BuffType'],'name':loc(bt['TitleKey']),
                'value':b['Value']/10 if bt['NumberPercent']==2 else b['Value'],'unit':'%' if bt['NumberPercent']==2 else 'pontos'})
        return output
    def role_skills(refs):
        result=[]
        for ref in refs:
            sid,level=ref['Data'];r=skills[(sid,level)]
            result.append({'id':sid,'level':level,'name':loc(r['NameKey']),'description':loc(r['DesKey'])})
        return result
    elements={1:'Fogo',2:'Água',3:'Grama',4:'Físico'}
    chips=[]
    for r in basic:
        ranks=sorted([s for s in stars if s['Id']==r['Id']],key=lambda s:s['Star'])
        chips.append({'id':r['Id'],'name':loc(r['NameKey']),'nameEn':loc(r['NameKey'],'en'),'element':elements[r['Type']],
            'slot':r['Pos'],'setId':r['Suit'],'tier':'oc' if r['Special'] else {2:'uncommon',3:'purple',4:'legendary'}[r['Quality']],
            'ranks':[{'rank':s['Star'],'stars':s['ShowStar'],'attributes':attributes(s['PetBuff'])} for s in ranks]})
    sets=[]
    for sid in sorted({c['setId'] for c in chips}-{0}):
        members=[c for c in chips if c['setId']==sid];effects=[]
        for r in suits:
            if r['SuitId']!=sid:continue
            effects.append({'id':r['Id'],'pieces':r['SuitType'],'rank':r['Star'],'stars':r['ShowStar'],
                'name':loc(r['EffectNameKey']),'description':loc(r['DescKey']),
                'attributes':attributes(r['PetBuff']),'leaderSkills':role_skills(r['Skill']),'supportSkills':role_skills(r['SubSkill'])})
        first=next(r for r in suits if r['SuitId']==sid)
        text=next(e['description'] for e in effects if e['pieces']==2 and e['rank']==1).casefold()
        focus='counter' if 'contra-ataque' in text else 'combo' if 'combo' in text else 'crit'
        sets.append({'id':sid,'name':loc(first['NameKey']),'element':members[0]['element'],'tier':members[0]['tier'],
            'focus':focus,'slots':sorted(c['slot'] for c in members),'chipIds':[c['id'] for c in members],
            'modes':['Invasão','Guarnição'] if sid==84 else ['Campo','Invasão','Guarnição'],'effects':effects})
    assert len(chips)==len({c['id'] for c in chips})
    assert all(len(s['slots'])==len(set(s['slots'])) and s['effects'] for s in sets)
    return {'schemaVersion':1,'asOf':summary['generatedAt'][:10],'client':summary['version']['version'],
        'build':summary['version']['build'],'patch':summary['version']['patchversion'],'manifest':summary['manifest'],
        'sourceHashes':{f:hashlib.sha256((snapshot/f).read_bytes()).hexdigest() for f in ['tables_current.json','string_parts.json','scan_summary.json']},
        'slots':[{'id':k,'name':v} for k,v in {1:'Braço esquerdo',2:'Braço direito',3:'Perna esquerda',4:'Perna direita',5:'Cérebro',6:'Coluna'}.items()],
        'chips':chips,'sets':sets,'rules':[{'key':k,'text':resolve(strings['pt'],k)} for k in ['6753973','824590705']]}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('snapshot');parser.add_argument('destination');parser.add_argument('--scanner-root',required=True);args=parser.parse_args()
    result=build(args.snapshot,args.scanner_root);target=Path(args.destination);temp=target.with_suffix('.tmp')
    temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(target)
    print(f'Imported {len(result["chips"])} chips and {len(result["sets"])} arrays')
