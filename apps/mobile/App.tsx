import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { setApiToken } from './src/api';
import { colors } from './src/theme';
import type { Adult, Session } from './src/types';
import { AdminHome, AdultDetail, AdultForm, AdultsList, ElderHome, Login, Register, Welcome } from './src/screens';

type Screen='welcome'|'login'|'register'|'home'|'adults'|'adultDetail'|'adultForm';
const SESSION_KEY='cuido_session';
export default function App(){
  const [fontsLoaded]=useFonts({Outfit_400Regular,Outfit_500Medium,Outfit_600SemiBold,Outfit_700Bold});
  const [session,setSession]=useState<Session|null>(null);const [screen,setScreen]=useState<Screen>('welcome');const [selected,setSelected]=useState<Adult|undefined>();const [ready,setReady]=useState(false);
  useEffect(()=>{SecureStore.getItemAsync(SESSION_KEY).then(raw=>{if(raw){const parsed=JSON.parse(raw) as Session;setApiToken(parsed.token);setSession(parsed);setScreen('home')}}).finally(()=>setReady(true))},[]);
  const login=async(value:Session)=>{setApiToken(value.token);setSession(value);await SecureStore.setItemAsync(SESSION_KEY,JSON.stringify(value));setScreen('home')};
  const logout=async()=>{setApiToken('');setSession(null);setSelected(undefined);await SecureStore.deleteItemAsync(SESSION_KEY);setScreen('welcome')};
  const go=(next:string,adult?:Adult)=>{if(adult)setSelected(adult);setScreen(next as Screen)};
  if(!fontsLoaded||!ready)return <View style={{flex:1,backgroundColor:colors.canvas,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={colors.teal}/></View>;
  let content:React.ReactNode;
  if(!session){content=screen==='login'?<Login back={()=>setScreen('welcome')} onSession={login} go={go}/>:screen==='register'?<Register back={()=>setScreen('welcome')} onSession={login}/>:<Welcome go={go}/>;}
  else if(session.usuario.rol==='ADULTO_MAYOR')content=<ElderHome session={session} logout={logout}/>;
  else if(screen==='adults')content=<AdultsList back={()=>setScreen('home')} go={go}/>;
  else if(screen==='adultDetail'&&selected)content=<AdultDetail adult={selected} back={()=>setScreen('adults')} edit={()=>setScreen('adultForm')}/>;
  else if(screen==='adultForm')content=<AdultForm adult={selected} back={()=>{setSelected(undefined);setScreen(selected?'adultDetail':'home')}} saved={(adult)=>{setSelected(adult);setScreen('adultDetail')}}/>;
  else content=<AdminHome key={screen} session={session} go={(n,a)=>{if(n==='adultForm'&&!a)setSelected(undefined);go(n,a)}} logout={logout}/>;
  return <><StatusBar style="light"/>{content}</>;
}

