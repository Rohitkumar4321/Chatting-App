// server/index.js
// Minimal Express + Socket.IO server with JWT + Mongo + simple models.
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.json());
app.use(cors());
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const PORT = process.env.PORT || 4000;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const User = mongoose.model('User', new mongoose.Schema({ name:String, email:{type:String,unique:true}, passwordHash:String, lastSeen:Date }));
const Conversation = mongoose.model('Conversation', new mongoose.Schema({ participants:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}], updatedAt:{type:Date, default:Date.now} }));
const Message = mongoose.model('Message', new mongoose.Schema({ conversation:{type:mongoose.Schema.Types.ObjectId, ref:'Conversation'}, sender:{type:mongoose.Schema.Types.ObjectId, ref:'User'}, text:String, createdAt:{type:Date, default:Date.now}, deliveredTo:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}], readBy:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}] }));
function authMiddleware(req,res,next){ const auth = req.headers.authorization; if(!auth) return res.status(401).send({error:'No token'}); const token = auth.replace('Bearer ',''); try{ const payload = jwt.verify(token, JWT_SECRET); req.userId = payload.id; next(); }catch(e){ res.status(401).send({error:'Invalid token'}); } }
app.post('/auth/register', async (req,res)=>{ try{ const {name,email,password} = req.body; if(!email||!password) return res.status(400).send({error:'Missing fields'}); const existing = await User.findOne({email}); if(existing) return res.status(400).send({error:'Email in use'}); const passwordHash = await bcrypt.hash(password,10); const user = await User.create({name,email,passwordHash,lastSeen:new Date()}); const token = jwt.sign({id:user._id},JWT_SECRET); res.send({token,user:{id:user._id,name:user.name,email:user.email}}); }catch(err){ res.status(500).send({error:err.message}); } });
app.post('/auth/login', async (req,res)=>{ try{ const {email,password} = req.body; const user = await User.findOne({email}); if(!user) return res.status(400).send({error:'Invalid credentials'}); const ok = await bcrypt.compare(password,user.passwordHash); if(!ok) return res.status(400).send({error:'Invalid credentials'}); user.lastSeen = new Date(); await user.save(); const token = jwt.sign({id:user._id},JWT_SECRET); res.send({token,user:{id:user._id,name:user.name,email:user.email}}); }catch(err){ res.status(500).send({error:err.message}); } });
app.get('/users', authMiddleware, async (req,res)=>{ const users = await User.find({_id:{$ne:req.userId}}).select('name email lastSeen'); res.send(users); });
app.get('/conversations/:id/messages', authMiddleware, async (req,res)=>{ const convId = req.params.id; const messages = await Message.find({conversation:convId}).sort('createdAt').populate('sender','name'); res.send(messages); });
const onlineMap = new Map();
io.use((socket,next)=>{ const token = socket.handshake.auth?.token; if(!token) return next(new Error('Auth token required')); try{ const payload = jwt.verify(token, JWT_SECRET); socket.userId = payload.id; next(); }catch(e){ next(new Error('Invalid token')); } });
io.on('connection', (socket)=>{ const uid = socket.userId.toString(); onlineMap.set(uid,socket.id); io.emit('user:online',{userId:uid}); socket.on('typing:start',({to})=>{ const toSocket = onlineMap.get(to); if(toSocket) io.to(toSocket).emit('typing:start',{from:uid}); }); socket.on('typing:stop',({to})=>{ const toSocket = onlineMap.get(to); if(toSocket) io.to(toSocket).emit('typing:stop',{from:uid}); }); socket.on('message:send', async ({conversationId,to,text})=>{ let conv = null; if(conversationId) conv = await Conversation.findById(conversationId); if(!conv){ conv = await Conversation.create({participants:[uid,to]}); } const msg = await Message.create({conversation:conv._id,sender:uid,text,createdAt:new Date()}); conv.updatedAt = new Date(); await conv.save(); const toSocket = onlineMap.get(to); const payload = {id:msg._id,conversation:conv._id,sender:uid,text:msg.text,createdAt:msg.createdAt}; if(toSocket){ io.to(toSocket).emit('message:new',payload); msg.deliveredTo.push(to); await msg.save(); socket.emit('message:delivered',{messageId:msg._id,to}); } socket.emit('message:new',payload); });
socket.on('message:read', async ({messageId})=>{ const msg = await Message.findById(messageId); if(!msg) return; if(!msg.readBy.includes(uid)){ msg.readBy.push(uid); await msg.save(); } const senderSocket = onlineMap.get(msg.sender.toString()); if(senderSocket) io.to(senderSocket).emit('message:read',{messageId,by:uid}); });
socket.on('disconnect', async ()=>{ onlineMap.delete(uid); await User.findByIdAndUpdate(uid,{lastSeen:new Date()}); io.emit('user:offline',{userId:uid}); }); });
server.listen(PORT, ()=>console.log('Server listening on',PORT));
