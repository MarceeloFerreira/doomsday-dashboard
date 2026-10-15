import {NextResponse} from 'next/server';
import {gallerySource} from './gallery-source';
import auth from './member-auth.cjs';
import {requestSheet} from './sheet-request.cjs';
export async function galleryPhoto(request,publicAccess=false,fileId=null){
  const headers={'Cache-Control':'private, no-store'};
  if(!publicAccess&&!auth.valid(request.cookies.get('bope_member')?.value))return NextResponse.json({error:'Acesso de membros necessário.'},{status:401,headers});
  const file=fileId||request.nextUrl.searchParams.get('file');
  if(!file||! /^[\w-]{10,200}$/.test(file))return NextResponse.json({error:'Foto inválida.'},{status:400,headers});
  try{
    if(publicAccess){
      const gallery=await gallerySource();
      if(!gallery.available)return NextResponse.json({error:'Galeria temporariamente indisponível.'},{status:503,headers});
      if(!gallery.gallery.some(item=>item.file===file))return NextResponse.json({error:'Foto não encontrada na galeria ativa.'},{status:404,headers});
    }
    const url=new URL(process.env.GOOGLE_SHEETS_SCRIPT_URL?.trim());
    if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec')||!process.env.GOOGLE_SHEETS_SCRIPT_TOKEN)throw Error('Configuração indisponível');
    const r=await requestSheet(fetch,url,process.env.GOOGLE_SHEETS_SCRIPT_TOKEN.trim(),{action:'photo',file});
    if(!r.ok)throw Error('Leitura falhou');
    const body=await r.json();
    if(!body.ok||!['image/jpeg','image/png','image/webp','image/gif'].includes(body.mime)||typeof body.base64!=='string'||body.base64.length>6*1024*1024)throw Error('Foto indisponível');
    const bytes=Buffer.from(body.base64,'base64');
    if(!bytes.length||bytes.length>4*1024*1024)throw Error('Foto inválida');
    return new NextResponse(bytes,{headers:{'Content-Type':body.mime,'Cache-Control':publicAccess?'public, max-age=60, s-maxage=60':'private, max-age=300','Netlify-Vary':'query=file','X-Content-Type-Options':'nosniff'}});
  }catch{return NextResponse.json({error:'Não foi possível carregar esta foto. Confira o link e o acesso do Apps Script ao Drive.'},{status:502,headers});}
}
