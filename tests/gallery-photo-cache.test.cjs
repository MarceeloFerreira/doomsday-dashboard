const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function handler(){
 const source=fs.readFileSync(path.join(__dirname,'../lib/gallery-photo.js'),'utf8').replace(/^import .*;$/gm,'').replace('export async function','async function');
 const ids=[];
 const context={URL,Buffer,NextResponse:Response,process:{env:{GOOGLE_SHEETS_SCRIPT_URL:'https://script.google.com/macros/s/test/exec',GOOGLE_SHEETS_SCRIPT_TOKEN:'local-test-only'}},fetch:()=>{},auth:{valid:()=>false},requestSheet:async(_,url,token,{file})=>{ids.push(file);return {ok:true,json:async()=>file==='unlisted_photo_id'?{ok:false}:{ok:true,mime:'image/png',base64:Buffer.from(file).toString('base64')}};}};
 vm.createContext(context);vm.runInContext(source,context);return {get:context.galleryPhoto,ids};
}
test('distinct photo paths request distinct files and return distinct image bytes',async()=>{
 const {get,ids}=handler();
 const request={nextUrl:new URL('https://example.com/api/queimadinhos/photos/first_photo_id')};
 const first=await get(request,true,'first_photo_id');
 const second=await get(request,true,'second_photo_id');
 assert.equal(await first.text(),'first_photo_id');assert.equal(await second.text(),'second_photo_id');
 assert.deepEqual(ids,['first_photo_id','second_photo_id']);
 assert.equal(first.headers.get('Netlify-Vary'),'query=file');
});
test('legacy query photo URLs also carry the file-specific CDN variation',async()=>{
 const {get}=handler();const r=await get({nextUrl:new URL('https://example.com/api/queimadinhos/photos?file=first_photo_id')},true);
 assert.equal(await r.text(),'first_photo_id');assert.equal(r.headers.get('Netlify-Vary'),'query=file');
});
