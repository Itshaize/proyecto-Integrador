import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase, type Db } from '../src/db.js';

const cedula=(firstNine:string)=>{const d=firstNine.split('').map(Number);const sum=d.reduce((t,n,i)=>t+(i%2===0?(n*2>9?n*2-9:n*2):n),0);return `${firstNine}${(10-sum%10)%10}`};
const admin={nombre:'Ana Sofía Ruiz',cedula:cedula('171234567'),correo:'ana@cuido.ec',telefono:'0987654321',password:'Clave1234'};
const adult=(n:number)=>({nombre:n===1?'María Elena Guzmán':'Carlos Vicente Mora',cedula:cedula(`09266878${n}`),correo:`adulto${n}@cuido.ec`,telefono:`09945678${n}0`,password:'Temporal123',fecha_nacimiento:'1952-04-18',direccion:'Av. Amazonas y Naciones Unidas',contacto_emergencia:'0987654321',foto:null,latitude:-0.1769,longitude:-78.4803,estado:'ACTIVO'});

describe('Cuido+ API',()=>{
  let db:Db; let app:ReturnType<typeof createApp>; let token='';
  beforeEach(async()=>{db=createDatabase(':memory:');app=createApp(db,async(d)=>({direccion:`${d}, Quito, Ecuador`,latitude:-0.1807,longitude:-78.4678}));const r=await request(app).post('/api/auth/register').send(admin);token=r.body.token;});
  afterEach(()=>db.close());
  it('registra administrador, impide correo repetido e inicia sesión',async()=>{
    assert.ok(token);const duplicate=await request(app).post('/api/auth/register').send({...admin,cedula:cedula('171111111')});assert.equal(duplicate.status,409);
    const login=await request(app).post('/api/auth/login').send({correo:admin.correo,password:admin.password});assert.equal(login.status,200);assert.equal(login.body.usuario.rol,'ADMINISTRADOR');
  });
  it('registra dos adultos, crea sus cuentas y bloquea el tercero',async()=>{
    const one=await request(app).post('/api/adults').set('Authorization',`Bearer ${token}`).send(adult(1));assert.equal(one.status,201);assert.equal(one.body.adulto.adultId,1);
    const two=await request(app).post('/api/adults').set('Authorization',`Bearer ${token}`).send(adult(2));assert.equal(two.status,201);
    const third=await request(app).post('/api/adults').set('Authorization',`Bearer ${token}`).send({...adult(1),cedula:cedula('110468793'),correo:'tercero@cuido.ec'});assert.equal(third.status,409);assert.equal(third.body.code,'ADULT_LIMIT_REACHED');
    const adultLogin=await request(app).post('/api/auth/login').send({correo:'adulto1@cuido.ec',password:'Temporal123'});assert.equal(adultLogin.body.usuario.rol,'ADULTO_MAYOR');
  });
  it('lista, consulta y edita solo adultos propios',async()=>{
    await request(app).post('/api/adults').set('Authorization',`Bearer ${token}`).send(adult(1));
    const list=await request(app).get('/api/adults').set('Authorization',`Bearer ${token}`);assert.equal(list.body.total,1);assert.equal(list.body.adultos[0].adultId,1);
    const updated={...adult(1),telefono:'0991112233',direccion:'Calle Rosales 47'};delete (updated as any).password;
    const edit=await request(app).put('/api/adults/1').set('Authorization',`Bearer ${token}`).send(updated);assert.equal(edit.status,200);assert.equal(edit.body.adulto.telefono,'0991112233');
  });
  it('convierte una dirección de Quito en coordenadas',async()=>{const r=await request(app).post('/api/geocoding/address').set('Authorization',`Bearer ${token}`).send({direccion:'La Carolina'});assert.equal(r.status,200);assert.equal(r.body.latitude,-0.1807);});
});

