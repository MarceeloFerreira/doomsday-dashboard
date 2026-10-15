import {NextResponse} from 'next/server';
import auth from '../../../../lib/member-auth.cjs';
import {createSessionHandlers} from '../../../../lib/session-handlers.cjs';
export const runtime='nodejs';
const handlers=createSessionHandlers({auth,NextResponse,cookieName:'bope_member',unconfigured:'A área de membros ainda não foi configurada no servidor.'});
export const GET=handlers.GET;
export const POST=handlers.POST;
export const DELETE=handlers.DELETE;
