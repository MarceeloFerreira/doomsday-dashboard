const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {getStore}=require('@netlify/blobs');
const {STORE,validateCalendar,calendarHash}=require('../lib/calendar-data.cjs');
const {publishCalendar}=require('../lib/calendar-publish.cjs');
const root=path.resolve(__dirname,'..');
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return {};}}
async function main(){
  const data=read(path.join(root,'public/data/calendar.json'));
  validateCalendar(data);
  if(process.argv.includes('--check')){
    console.log(JSON.stringify({status:'valid',events:data.events.length,hash:calendarHash(data)}));return;
  }
  const siteID=process.env.NETLIFY_SITE_ID||read(path.join(root,'.netlify/state.json')).siteId;
  const config=read(path.join(process.env.XDG_CONFIG_HOME||path.join(os.homedir(),'.config'),'netlify/config.json'));
  const token=process.env.NETLIFY_AUTH_TOKEN||config.users?.[config.userId]?.auth?.token;
  if(!siteID||!token)throw Error('Netlify não autenticado/vinculado. Execute npx netlify-cli login e npx netlify-cli link, ou configure NETLIFY_SITE_ID e NETLIFY_AUTH_TOKEN no ambiente local.');
  console.log(JSON.stringify(await publishCalendar(getStore({name:STORE,siteID,token,consistency:'strong'}),data)));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
