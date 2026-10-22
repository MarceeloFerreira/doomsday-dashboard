import {NextResponse} from 'next/server';
import {createAccountHandlers} from '../../../../lib/account-handlers.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const handlers=createAccountHandlers({NextResponse});
export const GET=handlers.PENDING;
