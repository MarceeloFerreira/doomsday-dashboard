import {galleryPhoto} from '../../../../lib/gallery-photo';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=request=>galleryPhoto(request);
