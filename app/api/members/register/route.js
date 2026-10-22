import {NextResponse} from 'next/server';
import {createAccountHandlers} from '../../../../lib/account-handlers.cjs';
export const runtime='nodejs';
export const POST=createAccountHandlers({NextResponse}).REGISTER;
