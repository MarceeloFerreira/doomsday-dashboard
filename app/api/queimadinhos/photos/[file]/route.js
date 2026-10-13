import {galleryPhoto} from '../../../../../lib/gallery-photo';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
  const {file}=await params;
  return galleryPhoto(request,true,file);
}
