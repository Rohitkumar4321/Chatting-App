// mobile/App.js
// Minimal React Native app (Expo-compatible) demonstrating auth, user list, and chat with Socket.IO.
import React, {useEffect, useState, useRef} from 'react';
import { SafeAreaView, View, Text, TextInput, Button, FlatList, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import io from 'socket.io-client';
const API = 'http://localhost:4000';
export default function App(){ 
  const [token,setToken] = useState(null);
  const [email,setEmail] = useState('alice@example.com');
  const [password,setPassword] = useState('password');
  const [users,setUsers] = useState([]);
  const [selectedUser,setSelectedUser] = useState(null);
  const [messages,setMessages] = useState([]);
  const [text,setText] = useState('');
  const socketRef = useRef(null);
  useEffect(()=>{ if(token){ socketRef.current = io(API, { auth:{ token } }); socketRef.current.on('connect', ()=>console.log('socket connected')); socketRef.current.on('message:new', (m)=>{ setMessages(prev=>[...prev,m]); }); socketRef.current.on('typing:start', ({from})=>{ console.log('typing from',from); }); } return ()=>{ socketRef.current?.disconnect(); } }, [token]);
  const login = async ()=>{ const res = await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}); const j = await res.json(); if(j.token){ setToken(j.token); fetchUsers(j.token); } };
  const fetchUsers = async (t)=>{ const res = await fetch(API+'/users',{headers:{Authorization:'Bearer '+t}}); const j = await res.json(); setUsers(j); };
  const startChat = async (user)=>{ setSelectedUser(user); // in real app fetch/create conversation id; here we just set selected user
    // fetch last messages if conversation id available
  };
  const send = ()=>{ if(!text) return; socketRef.current.emit('message:send',{ to:selectedUser._id, text }); setText(''); };
  if(!token) return (<SafeAreaView style={{flex:1,padding:20}}><Text>Login</Text><TextInput placeholder='email' value={email} onChangeText={setEmail} /><TextInput placeholder='password' value={password} onChangeText={setPassword} secureTextEntry /><Button title='Login' onPress={login} /></SafeAreaView>);
  return (<SafeAreaView style={{flex:1}}><View style={{padding:12}}><Text>Users</Text><FlatList data={users} keyExtractor={u=>u._id} renderItem={({item})=> (<TouchableOpacity onPress={()=>startChat(item)} style={{padding:8,borderBottomWidth:1}}><Text>{item.name}</Text></TouchableOpacity>)} /></View>{selectedUser && (<KeyboardAvoidingView behavior='padding' style={{flex:1}}><Text>Chat with {selectedUser.name}</Text><FlatList data={messages} keyExtractor={m=>m.id||m._id} renderItem={({item})=> <View style={{padding:6}}><Text>{item.sender===undefined || item.sender===null ? item.sender : item.sender}</Text><Text>{item.text}</Text></View>} /></KeyboardAvoidingView>)}{selectedUser && (<View style={{flexDirection:'row',padding:8}}><TextInput value={text} onChangeText={t=>{ setText(t); socketRef.current.emit('typing:start',{to:selectedUser._id}); }} style={{flex:1,borderWidth:1,padding:8}} /><Button title='Send' onPress={send} /></View>)}</SafeAreaView>);
}
