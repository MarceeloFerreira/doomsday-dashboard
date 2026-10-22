const {createHash,randomBytes}=require('node:crypto');
const {playerChoices,occupiedMessage}=require('./roster-players.cjs');
const COOKIE='bope_account',MAX_AGE=8*3600;
let ipv4Dispatcher;
function accountFetch(url,init){
  const options={...init,cache:'no-store',signal:AbortSignal.timeout(15000)};
  if(process.env.SUPABASE_FORCE_IPV4==='true'){
    // Local WSL DNS may stall on AAAA lookups. Scope the workaround to these
    // outbound requests; do not change OS DNS, global agents, or TLS validation.
    const {fetch:ipv4Fetch,Agent}=require('undici');
    ipv4Dispatcher??=new Agent({connect:{family:4}});
    return ipv4Fetch(url,{...options,dispatcher:ipv4Dispatcher});
  }
  return fetch(url,options);
}

const accountMode=()=>process.env.MEMBERS_AUTH_MODE==='accounts';
const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SECRET_KEY);
function failure(message,status=400){return Object.assign(new Error(message),{status,safe:true});}
function tokenHash(token){return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)?createHash('sha256').update(token).digest('hex'):null;}
function canAccess(profile,admin=false){return Boolean(profile?.status==='active'&&profile.player_id&&!profile.reset_pending&&(!admin||profile.role==='admin'));}
function publicProfile(p){return p?{id:p.id,email:p.email,displayName:p.display_name,role:p.role,status:p.status,playerId:p.player_id,player:p.player||null}:null;}
function validateCredentials(input,register=false){
  if(!input||typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email.trim()))throw failure('Informe um e-mail válido para entrar na conta.');
  if(typeof input.password!=='string'||input.password.length<6||input.password.length>128)throw failure('A senha deve ter de 6 a 128 caracteres.');
  if(register&&(typeof input.displayName!=='string'||input.displayName.trim().length<1||input.displayName.trim().length>80))throw failure('Informe seu nome ou nick, com até 80 caracteres.');
  return {email:input.email.trim().toLowerCase(),password:input.password,displayName:input.displayName?.trim()};
}
function createAccounts({clientFactory,now=()=>new Date(),rosterSource}={}){
  function client(admin=false){
    if(!configured())throw failure('O cadastro de contas precisa ser configurado no servidor.',503);
    const {createClient}=clientFactory?{createClient:clientFactory}:require('@supabase/supabase-js');
    return createClient(process.env.SUPABASE_URL,admin?process.env.SUPABASE_SECRET_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:accountFetch}});
  }
  function dbError(error){
    if(!error)return;
    if(error.code==='23505')throw failure('Este player ou ID já está cadastrado ou vinculado a outra conta.',409);
    const messages={pending_only:['Só é possível excluir pedidos pendentes que nunca foram aprovados. Contas já aprovadas devem ser inativadas.',409],confirmation_changed:['Os dados do pedido mudaram. Atualize os cadastros e confirme novamente.',409],admin_required:['Acesso exclusivo de administradores ativos.',403],last_admin:['Mantenha pelo menos um administrador ativo.',409],player_required:['Vincule um player antes de ativar a conta.',400],member_not_found:['Conta não encontrada.',404],invalid_member:['Papel ou situação inválidos.',400],invalid_player:['Informe um nick válido.',400],reset_in_progress:['Uma redefinição de senha está em andamento para esta conta.',409],login_changed:['O acesso mudou. Entre novamente.',401]};
    if(messages[error.message])throw failure(...messages[error.message]);
    throw failure('Não foi possível acessar o cadastro. Tente novamente em instantes.',503);
  }
  async function profile(id){const {data,error}=await client(true).from('member_profiles').select('*,player:alliance_players(id,nick,game_id)').eq('id',id).maybeSingle();dbError(error);return data;}
  async function session(token){
    const hash=tokenHash(token);if(!hash)return null;
    const {data,error}=await client(true).from('member_sessions').select('user_id').eq('token_hash',hash).gt('expires_at',now().toISOString()).maybeSingle();
    dbError(error);if(!data)return null;
    const p=await profile(data.user_id);return p&&!p.reset_pending?{profile:p,hash}:null;
  }
  async function requireSession(token,admin=false){const s=await session(token);if(!s)throw failure('Entre novamente na sua conta.',401);if(!canAccess(s.profile,admin))throw failure('Sua conta não tem acesso a esta área.',403);return s;}
  async function register(input){
    const {email,password,displayName}=validateCredentials(input,true);
    const {data,error}=await client().auth.signUp({email,password,options:{data:{display_name:displayName}}});
    if(error){if(error.name==='AuthRetryableFetchError'||!error.status||error.status>=500)throw failure('Não foi possível conectar ao serviço de contas. Aguarde e tente novamente.',503);if(error.status===429)throw failure('Muitas tentativas. Aguarde alguns minutos.',429);throw failure('Não foi possível criar a conta. Confira os dados ou tente entrar se já tem cadastro.');}
    if(!data.session)throw failure('O servidor ainda exige confirmação de e-mail. Peça à liderança para concluir a configuração.',503);
    // Supabase's token is never sent to the browser; the new account remains pending.
    return {message:'Entre com seu e-mail e senha. Seu acesso às ferramentas será liberado após a aprovação da liderança.'};
  }
  async function login(input){
    const {email,password}=validateCredentials(input);
    const {data,error}=await client().auth.signInWithPassword({email,password});
    if(error){if(error.name==='AuthRetryableFetchError'||!error.status||error.status>=500)throw failure('Não foi possível conectar ao serviço de contas. Aguarde e tente novamente.',503);if(error.status===429)throw failure('Muitas tentativas. Aguarde alguns minutos.',429);throw failure('E-mail ou senha incorretos.',401);}
    const p=await profile(data.user.id);if(!p||p.reset_pending)throw failure('O acesso está sendo atualizado. Tente novamente.',403);
    const token=randomBytes(32).toString('hex');
    const {error:db}=await client(true).rpc('bope_create_session',{p_user:p.id,p_auth_updated_at:data.user.updated_at,p_token_hash:tokenHash(token)});dbError(db);
    return {token,profile:p};
  }
  async function logout(token){const hash=tokenHash(token);if(hash){const {error}=await client(true).from('member_sessions').delete().eq('token_hash',hash);dbError(error);}}
  async function registry(){
    const db=client(true);
    const [profiles,players]=await Promise.all([db.from('member_profiles').select('id,email,display_name,role,status,player_id,reset_pending,created_at,updated_at').order('created_at',{ascending:false}).limit(1000),db.from('alliance_players').select('*').order('nick').limit(1000)]);
    dbError(profiles.error);dbError(players.error);return {members:profiles.data,players:players.data};
  }
  async function pendingCount(token){
    await requireSession(token,true);
    const {count,error}=await client(true).from('member_profiles').select('id',{count:'exact',head:true}).eq('status','pending');dbError(error);
    return {pending:count||0};
  }
  async function roster(){try{return rosterSource?await rosterSource():null;}catch{return null;}}
  async function list(token){
    await requireSession(token,true);
    const [data,source]=await Promise.all([registry(),roster()]);
    return {...data,...playerChoices(source,data.players,data.members)};
  }
  async function assertFree(db,playerId,target){
    const {data,error}=await db.from('member_profiles').select('id,display_name,email').eq('player_id',playerId).neq('id',target).maybeSingle();dbError(error);
    if(data)throw failure(occupiedMessage({name:data.display_name,email:data.email}),409);
  }
  async function resolvePlayer(token,choiceId,target){
    const choices=await list(token),choice=choices.players.find(p=>p.id===choiceId);
    if(!choice)throw failure('Esse player não está na lista atual. Atualize os cadastros e selecione novamente.',409);
    if(choice.owner&&choice.owner.id!==target)throw failure(occupiedMessage(choice.owner),409);
    const db=client(true);
    let id=choice.id;
    if(id.startsWith('sheet:')){
      const {data,error}=await db.from('alliance_players').insert({nick:choice.nick,game_id:choice.game_id}).select('id').single();
      if(error?.code==='23505'){
        // Another administrator may have selected the same sheet row at once.
        const found=choice.game_id?await db.from('alliance_players').select('id').eq('game_id',choice.game_id).maybeSingle():await db.from('alliance_players').select('id').ilike('nick',choice.nick.replace(/[\\%_]/g,'\\$&')).maybeSingle();
        dbError(found.error);if(!found.data)dbError(error);id=found.data.id;
      }else{dbError(error);id=data.id;}
    }else if(choice.fromSheet){
      const {error}=await db.from('alliance_players').update({nick:choice.nick,...(choice.game_id?{game_id:choice.game_id}:{})}).eq('id',id);dbError(error);
    }
    await assertFree(db,id,target);return id;
  }
  async function command(token,input){
    const s=await requireSession(token,true);
    if(!input||!['save_member','create_player','reset_password','delete_pending'].includes(input.action))throw failure('Ação inválida.');
    if(input.action!=='create_player'&&(typeof input.target!=='string'||!/^[a-f0-9-]{36}$/i.test(input.target)))throw failure('Conta inválida.');
    if(input.action==='delete_pending'){
      if(input.target===s.profile.id)throw failure('Você não pode excluir sua própria conta.',409);
      if(input.confirm!==true||typeof input.email!=='string'||input.email.length>254)throw failure('Confirme a exclusão do pedido antes de continuar.');
      const db=client(true);
      const {error:prepare}=await db.rpc('bope_prepare_pending_deletion',{p_token_hash:s.hash,p_target:input.target,p_email:input.email});if(prepare?.code==='PGRST202')throw failure('A exclusão de pedidos precisa da atualização do banco. Execute a migração de exclusão de pedidos pendentes no Supabase.',503);dbError(prepare);
      // The transaction blocks login and approval before calling the Auth API.
      // If Auth fails, keep the request blocked and allow administrators to retry.
      const {error:removed}=await db.auth.admin.deleteUser(input.target,false);
      if(removed)throw failure('Não foi possível concluir a exclusão. O pedido permanece bloqueado; tente Excluir pedido novamente.',503);
      return {message:'Pedido e conta pendente excluídos. A pessoa pode se cadastrar novamente com o mesmo e-mail.'};
    }
    let action=input.action,data={};
    if(action==='create_player'){
      if(typeof input.nick!=='string'||!input.nick.trim()||input.nick.trim().length>80||input.gameId&&(!/^[0-9]{1,30}$/.test(input.gameId)))throw failure('Informe o nick e, se disponível, um ID numérico válido.');
      data={nick:input.nick.trim(),game_id:input.gameId||null};
    }else if(action==='save_member'){
      if(!['member','admin'].includes(input.role)||!['pending','active','inactive'].includes(input.status))throw failure('Papel ou situação inválidos.');
      if(input.status==='active'&&!input.playerId)throw failure('Vincule um player antes de ativar a conta.');
      if(input.playerId&&(typeof input.playerId!=='string'||input.playerId.length>400))throw failure('Player inválido.');
      const playerId=input.playerId?await resolvePlayer(token,input.playerId,input.target):null;
      data={role:input.role,status:input.status,player_id:playerId};
    }else{
      if(typeof input.password!=='string'||input.password.length<6||input.password.length>128)throw failure('A nova senha deve ter de 6 a 128 caracteres.');
      // Resetting one's own password from this admin endpoint would revoke the
      // session needed to complete it. Another admin must perform this action.
      if(input.target===s.profile.id)throw failure('Peça a outro administrador para redefinir sua senha.');
      action='begin_password_reset';
    }
    const db=client(true);
    const {data:result,error}=await db.rpc('bope_admin_command',{p_token_hash:s.hash,p_action:action,p_target:input.target||null,p_data:data});
    if(error?.code==='23505'&&input.action==='save_member'&&data.player_id)await assertFree(db,data.player_id,input.target);
    dbError(error);
    if(input.action==='reset_password'){
      // The transaction above blocks sessions/login before the Auth password is changed.
      let changed=false;
      try{
        const {error:resetError}=await db.auth.admin.updateUserById(input.target,{password:input.password});
        if(resetError)throw failure('Não foi possível redefinir a senha. Confira os requisitos e tente novamente.',503);
        changed=true;
      }finally{
        // If this fails, the account deliberately stays blocked, rather than allowing stale sessions.
        const {error:finish}=await db.from('member_profiles').update({reset_pending:false,updated_at:now().toISOString()}).eq('id',input.target);
        if(finish)throw failure('A redefinição precisa ser concluída pela manutenção do site. A conta permanece bloqueada.',503);
        if(changed){const {error:audit}=await db.from('member_audit').insert({actor_id:s.profile.id,target_id:input.target,action:'password_reset_completed'});dbError(audit);}
      }
      return {message:'Senha redefinida. As sessões anteriores foram encerradas.'};
    }
    return {message:input.action==='create_player'?'Player cadastrado.':'Cadastro atualizado.',result};
  }
  return {session,requireSession,register,login,logout,list,command,pendingCount};
}
module.exports={COOKIE,MAX_AGE,accountMode,configured,tokenHash,canAccess,publicProfile,validateCredentials,createAccounts,failure};
