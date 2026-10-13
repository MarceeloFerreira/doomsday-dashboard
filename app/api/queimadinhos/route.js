import {NextResponse} from 'next/server';
import {gallerySource} from '../../../lib/gallery-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Public by the alliance owner's explicit choice. Never return scores or member metadata.
export async function GET(){return NextResponse.json(await gallerySource(),{headers:{'Cache-Control':'no-store'}});}
