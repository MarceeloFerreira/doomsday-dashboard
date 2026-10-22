'use client';
import {useEffect,useState} from 'react';
export default function BackToTop(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const update=()=>setVisible(window.scrollY>650);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
  if(!visible)return null;
  function go(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});document.getElementById('main-content')?.focus({preventScroll:true});}
  return <button type="button" className="back-to-top" onClick={go} aria-label="Voltar ao topo da página"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v14"/></svg><span>Voltar ao topo</span></button>;
}
