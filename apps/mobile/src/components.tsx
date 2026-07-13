import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from './theme';

export function Brand({compact=false}:{compact?:boolean}) {
  return <View style={styles.brand}><View style={[styles.mark,compact&&{width:36,height:36,borderRadius:12}]}><View style={styles.markDot}/><Ionicons name="shield-checkmark-outline" size={compact?21:28} color={colors.teal}/></View><Text style={[styles.brandText,compact&&{fontSize:20}]}>Cuido<Text style={{color:colors.teal}}>+</Text></Text></View>;
}
export function Button({title,onPress,icon,variant='primary',disabled=false,loading=false,style}:{title:string;onPress:()=>void;icon?:keyof typeof Ionicons.glyphMap;variant?:'primary'|'secondary'|'danger'|'ghost';disabled?:boolean;loading?:boolean;style?:ViewStyle}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled||loading} onPress={onPress} style={({pressed})=>[styles.button,styles[`button_${variant}`],(disabled||loading)&&styles.disabled,pressed&&styles.pressed,style]}>
    {loading?<ActivityIndicator color={variant==='primary'?colors.canvas:colors.text}/>:<>{icon&&<Ionicons name={icon} size={21} color={variant==='primary'?colors.canvas:colors.text}/>}<Text style={[styles.buttonText,variant==='primary'&&{color:colors.canvas}]}>{title}</Text></>}
  </Pressable>;
}
export function Field({label,error,hint,icon,...props}:TextInputProps&{label:string;error?:string;hint?:string;icon?:keyof typeof Ionicons.glyphMap}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={[styles.inputWrap,error&&styles.inputError]}>{icon&&<Ionicons name={icon} size={20} color={error?colors.danger:colors.muted}/>}<TextInput accessibilityLabel={label} placeholderTextColor={colors.subtle} style={styles.input} {...props}/></View>{error?<Text style={styles.error}>{error}</Text>:hint?<Text style={styles.hint}>{hint}</Text>:null}</View>;
}
export function Header({title,onBack,action}:{title:string;onBack?:()=>void;action?:React.ReactNode}) { return <View style={styles.header}>{onBack?<Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={12} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={colors.text}/></Pressable>:<Brand compact/>}<Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>{action??<View style={{width:44}}/>}</View>; }
export function Notice({message,type='info'}:{message:string;type?:'info'|'error'|'success'}) { const icon=type==='error'?'alert-circle':type==='success'?'checkmark-circle':'information-circle'; return <View accessibilityRole="alert" style={[styles.notice,type==='error'&&styles.noticeError,type==='success'&&styles.noticeSuccess]}><Ionicons name={icon} size={20} color={type==='error'?colors.danger:colors.teal}/><Text style={styles.noticeText}>{message}</Text></View>; }
export function Skeleton(){return <View style={styles.skeleton}><View style={styles.skeletonLine}/><View style={[styles.skeletonLine,{width:'58%'}]}/></View>}

const styles=StyleSheet.create({
  brand:{flexDirection:'row',alignItems:'center',gap:11},mark:{width:48,height:48,borderRadius:16,backgroundColor:colors.tealSoft,borderWidth:1,borderColor:colors.tealDeep,alignItems:'center',justifyContent:'center',overflow:'hidden'},markDot:{position:'absolute',width:22,height:22,borderRadius:11,backgroundColor:'rgba(39,199,184,.12)'},brandText:{color:colors.text,fontFamily:fonts.bold,fontSize:26,letterSpacing:-.8},
  button:{minHeight:54,borderRadius:radius.input,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,borderWidth:1,borderColor:'transparent'},button_primary:{backgroundColor:colors.teal},button_secondary:{backgroundColor:colors.elevated,borderColor:colors.line},button_danger:{backgroundColor:colors.danger},button_ghost:{backgroundColor:'transparent'},buttonText:{color:colors.text,fontFamily:fonts.semibold,fontSize:16},disabled:{opacity:.38},pressed:{transform:[{scale:.98}]},
  field:{gap:8},label:{fontFamily:fonts.medium,color:colors.text,fontSize:15},inputWrap:{minHeight:54,borderRadius:radius.input,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:10},input:{flex:1,color:colors.text,fontFamily:fonts.regular,fontSize:16,paddingVertical:14},inputError:{borderColor:colors.danger},error:{color:'#FF8392',fontFamily:fonts.regular,fontSize:13},hint:{color:colors.muted,fontFamily:fonts.regular,fontSize:13},
  header:{minHeight:68,flexDirection:'row',alignItems:'center',gap:12},headerTitle:{flex:1,color:colors.text,fontFamily:fonts.semibold,fontSize:19},iconButton:{width:44,height:44,borderRadius:14,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line},
  notice:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:14,borderRadius:14,backgroundColor:colors.tealSoft,borderWidth:1,borderColor:colors.tealDeep},noticeError:{backgroundColor:'#2B141B',borderColor:'#672131'},noticeSuccess:{backgroundColor:colors.tealSoft},noticeText:{flex:1,color:colors.text,fontFamily:fonts.regular,fontSize:14,lineHeight:20},
  skeleton:{height:92,borderRadius:radius.card,backgroundColor:colors.surface,padding:20,gap:12},skeletonLine:{height:12,borderRadius:6,backgroundColor:colors.elevated,width:'78%'},
});
