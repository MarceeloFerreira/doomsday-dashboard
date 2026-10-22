import {redirect} from 'next/navigation';
export const metadata={title:'Liderança · BoPE'};
export default async function Page({searchParams}){const data=(await searchParams)?.data;redirect('/membros?aba=lideranca'+(typeof data==='string'?'&data='+encodeURIComponent(data):''));}
