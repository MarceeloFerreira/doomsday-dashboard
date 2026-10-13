import MemberArea from '../MemberArea';
import {redirect} from 'next/navigation';
export const metadata={title:'Acesso de Membros · BoPE'};
export default async function Page({searchParams}){if((await searchParams)?.aba==='queimadinhos')redirect('/queimadinhos');return <MemberArea/>;}
