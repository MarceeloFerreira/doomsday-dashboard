"""Extract calendar evidence from the installed Windows client; never query game servers."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = Path(os.environ.get('DOOMSDAY_WORKSPACE', r'C:\Users\maarc\Documents\Codex\Doomsday'))
sys.path.insert(0, str(WORKSPACE / '.tools/unitypy'))
sys.path.insert(0, str(WORKSPACE))
import UnityPy
from hash_strings_20260928 import xxh

def tree(path):
    for obj in UnityPy.load(str(path)).objects:
        if obj.type.name == 'MonoBehaviour':
            value = obj.read_typetree()
            if isinstance(value.get('Data'), list):
                return value
    raise ValueError(f'No configuration data: {path}')

def strings(tr, language='pt'):
    pool = tr['TextPool'].encode('utf-16-le', 'surrogatepass')
    def part(v):
        return {-1:'text', -2:'value', -3:'ref'}[v['Start']] if v['Start'] < 0 else pool[v['Start']*2:(v['Start']+v['Length'])*2].decode('utf-16-le', 'surrogatepass')
    chunks = [dict(text=part(c['TextOrKey']), param=part(c['Param']), index=c['KeyIndex']) for c in tr['StrChunks']]
    result = {}
    for row in tr['Data']:
        ix = row['LangIndex'][tr['LanguageNames'].index(language)] if 'LangIndex' in row else row
        if ix['Length']:
            result[str(row['Id'])] = chunks[ix['Start']:ix['Start']+ix['Length']]
    return result

def date_array(value):
    if not isinstance(value, list) or len(value) < 3 or not value[0]:
        return None
    return dt.datetime(*map(int, value[:3]), int(value[3]) if len(value)>3 else 0, tzinfo=dt.timezone.utc)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT/'public/data/calendar.json')
    args = parser.parse_args()
    game = Path(os.environ.get('DOOMSDAY_GAME', r'C:\Program Files (x86)\Steam\steamapps\common\Doomsday Last Survivors'))
    cache = Path(os.environ.get('DOOMSDAY_CACHE', str(Path.home()/'AppData/LocalLow/IGG/Doomsday_Steam')))
    version_id = (cache/'version').read_text().strip()
    version = json.loads((cache/f'version_{version_id}').read_text())
    files = {re.sub(r'_\d+$','',p.stem):p for p in (game/'Doomsday_Data/StreamingAssets/ab').glob('*.ab')}
    missing = set()
    for key, item in version['list'].items():
        path = cache/'ab'/f"{key}_{item['code']}"/'00000000000000000000000000000000/__data'
        if path.exists(): files[key] = path
        else: missing.add(key)
    required = ['gameconfig_activity', 'gameconfig_string_pt', 'gameconfig_string_fix']
    if any(k in missing or k not in files for k in required):
        raise RuntimeError('Current calendar/localization bundle unavailable; preserving previous calendar')
    activities = tree(files[required[0]])['Data']
    localized = strings(tree(files[required[1]]))
    localized.update(strings(tree(files[required[2]])))
    def resolve(key, depth=0):
        if depth > 8: return ''
        key = str(key)
        parts = localized.get(str(xxh(key)), localized.get(key, []))
        return ''.join(resolve(p['param'],depth+1) if p['text']=='ref' else ('{'+str(p['index'])+'}' if p['index'] and p['text'] in ('text','value') else p['text']) for p in parts)
    events = []
    excluded = {'disabled':0,'hidden':0,'serverRelative':0,'permanent':0,'noDate':0,'noName':0}
    for row in activities:
        if row.get('Discontinue'): excluded['disabled']+=1; continue
        if row.get('HideType'): excluded['hidden']+=1; continue
        if any(row.get('PersonalDay') or []) or row.get('Time') != 1:
            excluded['serverRelative']+=1; continue
        start = date_array(row.get('Start'))
        duration = row.get('Duration',0)
        if duration>=999999: excluded['permanent']+=1; continue
        if not start or duration <= 0: excluded['noDate']+=1; continue
        key = next((r[0] for r in [row.get('ShowNameKey'),row.get('TitleKey')] if r and r[0] not in ('null','')), '')
        name = re.sub(r'<[^>]*>', '', resolve(key)).strip()
        if not name or name=='null': excluded['noName']+=1; continue
        end = date_array(row.get('End'))
        events.append({'id':row['Id'],'name':name,'start':start.isoformat(),'end':end.isoformat() if end else None,'durationDays':duration,'loopDays':row.get('LoopDay',0),'calendar':bool(row.get('Calendar')),'crossServer':bool(row.get('CrossServer')),'kingdomIds':row.get('KingdomId',[]),'serverDay':row.get('ServerDay',0),'serverDayEnd':row.get('ServerDayEnd',0),'sourceKey':key,'evidence':'client-config','startRaw':row['Start'],'hideType':row.get('HideType',0),'discontinue':row.get('Discontinue',0)})
    if len(events)<10 or len({e['id'] for e in events}) != len(events):
        raise RuntimeError('Invalid or unexpectedly empty calendar; previous data preserved')
    result={'schemaVersion':1,'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'clientVersion':version['version'],'build':version['build'],'patch':version['patchversion'],'manifest':version_id,'timezone':'UTC','source':'Arquivos locais do cliente; disponibilidade depende do servidor e reino.','events':events,'excluded':excluded,'sources':[{'table':k,'sha256':hashlib.sha256(files[k].read_bytes()).hexdigest(),'modifiedAt':dt.datetime.fromtimestamp(files[k].stat().st_mtime,dt.timezone.utc).isoformat()} for k in required]}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    status='updated'
    if args.output.exists():
        previous=json.loads(args.output.read_text(encoding='utf-8'))
        if {k:v for k,v in previous.items() if k!='generatedAt'} == {k:v for k,v in result.items() if k!='generatedAt'}:
            status='unchanged'
    temp=args.output.with_suffix('.tmp')
    temp.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    temp.replace(args.output)
    print(json.dumps({'status':status,'clientVersion':version['version'],'events':len(events),'excluded':excluded},ensure_ascii=True))

if __name__=='__main__': main()
