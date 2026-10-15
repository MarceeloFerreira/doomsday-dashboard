const {createSessionAuth}=require('./session-auth.cjs');
module.exports=createSessionAuth({'role': 'member', 'passwordKey': 'MEMBERS_PASSWORD', 'secretKeys': ['MEMBERS_SESSION_SECRET', 'R4_SESSION_SECRET']});
