import {Suspense} from 'react';
import Leadership from '../Leadership';
export const metadata={title:'Liderança / R4 · BoPE'};
export default function Page(){return <Suspense fallback={<p className="calendar-note">Carregando liderança…</p>}><Leadership/></Suspense>;}
