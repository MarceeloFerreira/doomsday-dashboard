import {NextResponse} from 'next/server';
import auth from '../../../../lib/r4-auth.cjs';
import {createSessionHandlers} from '../../../../lib/session-handlers.cjs';
export const runtime='nodejs';
const handlers=createSessionHandlers({auth,NextResponse,cookieName:'bope_r4',unconfigured:'A liderança ainda não foi configurada no servidor.'});
export const GET=handlers.GET;
export const POST=handlers.POST;
export const DELETE=handlers.DELETE;
