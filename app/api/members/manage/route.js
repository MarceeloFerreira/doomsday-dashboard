import {NextResponse} from 'next/server';
import {createAccountHandlers} from '../../../../lib/account-handlers.cjs';
import {createAccounts} from '../../../../lib/member-accounts.cjs';
import {memberRosterSource} from '../../../../lib/leadership-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const handlers=createAccountHandlers({NextResponse,service:createAccounts({rosterSource:memberRosterSource})});
export const GET=handlers.LIST;
export const POST=handlers.MANAGE;
