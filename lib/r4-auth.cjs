const {createSessionAuth}=require('./session-auth.cjs');
module.exports=createSessionAuth({'role': 'r4', 'passwordKey': 'R4_PASSWORD', 'secretKeys': ['R4_SESSION_SECRET']});
