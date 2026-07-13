export type Role = 'ADMINISTRADOR' | 'ADULTO_MAYOR';
export type User = { id_usuario:number; nombre:string; rol:Role; adultId?:number; id_administrador?:number };
export type Session = { token:string; usuario:User };
export type Adult = {
  adultId:number; id_adulto:number; id_usuario:number; id_administrador:number; nombre:string; cedula:string;
  correo:string; telefono:string; estado:'ACTIVO'|'INACTIVO'; fecha_nacimiento:string; direccion:string;
  latitude:number|null; longitude:number|null; contacto_emergencia:string; foto?:string|null;
};
export type AdultInput = Omit<Adult,'adultId'|'id_adulto'|'id_usuario'|'id_administrador'> & { password?:string };
export type ZoneState='DENTRO_DE_ZONA'|'FUERA_DE_ZONA'|'UBICACION_DESACTIVADA'|'SIN_ACTUALIZACION';
export type LocationData={id_ubicacion?:number;adultId:number;latitude:number;longitude:number;accuracy:number;fecha:string;hora:string;direccion?:string|null;estadoZona:ZoneState};
export type SafeZone={id_zona:number;id_adulto:number;adultId:number;nombre:string;direccion:string;latitude:number;longitude:number;radio:number;estado:'ACTIVO'|'INACTIVO'};
export type AlertItem={id_alerta:number;id_adulto:number;tipo:'SOS'|'FUERA_DE_ZONA';fecha:string;hora:string;latitude:number;longitude:number;estado:'NUEVA'|'VISTA'|'ATENDIDA'|'CERRADA'};
export type EmergencyContact={id_contacto:number;id_adulto:number;nombre:string;telefono:string;relacion:string};
export type NearbyPlace={id:string;nombre:string;direccion:string;latitude:number;longitude:number;categoria:'hospital'|'farmacia'|'centro_salud'|'policia'|'punto_ayuda';distancia:number};
export type RouteData={distancia:string;distanciaMetros:number;duracion:string;duracionSegundos:number;polyline:{encodedPolyline:string}};

