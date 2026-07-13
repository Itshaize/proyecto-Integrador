export type Role = 'ADMINISTRADOR' | 'ADULTO_MAYOR';
export type User = { id_usuario:number; nombre:string; rol:Role };
export type Session = { token:string; usuario:User };
export type Adult = {
  adultId:number; id_adulto:number; id_usuario:number; id_administrador:number; nombre:string; cedula:string;
  correo:string; telefono:string; estado:'ACTIVO'|'INACTIVO'; fecha_nacimiento:string; direccion:string;
  latitude:number|null; longitude:number|null; contacto_emergencia:string; foto?:string|null;
};
export type AdultInput = Omit<Adult,'adultId'|'id_adulto'|'id_usuario'|'id_administrador'> & { password?:string };

