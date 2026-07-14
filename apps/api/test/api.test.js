import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { connectDatabase, disconnectDatabase, models } from "../src/db.js";
const cedula = (firstNine) => {
  const d = firstNine.split("").map(Number);
  const sum = d.reduce((t, n, i) => t + (i % 2 === 0 ? n * 2 > 9 ? n * 2 - 9 : n * 2 : n), 0);
  return `${firstNine}${(10 - sum % 10) % 10}`;
};
const admin = { nombre: "Ana Sof\xEDa Ruiz", cedula: cedula("171234567"), correo: "ana@cuido.ec", telefono: "0987654321", password: "Clave1234" };
const adult = (n) => ({ nombre: n === 1 ? "Mar\xEDa Elena Guzm\xE1n" : "Carlos Vicente Mora", cedula: cedula(`09266878${n}`), correo: `adulto${n}@cuido.ec`, telefono: `09945678${n}0`, password: "Temporal123", fecha_nacimiento: "1952-04-18", direccion: "Av. Amazonas y Naciones Unidas", contacto_emergencia: "0987654321", foto: null, latitude: -0.1769, longitude: -78.4803, estado: "ACTIVO" });
describe("Cuido+ API integrada", () => {
  let app;
  let token = "";
  const originalFetch = globalThis.fetch;
  const originalKey = config.googleMapsApiKey;
  const testDatabase = `cuido_test_${Date.now()}`;
  before(async () => {
    await connectDatabase({ dbName: testDatabase });
  });
  beforeEach(async () => {
    await Promise.all(Object.values(models).map((model) => model.deleteMany({})));
    app = createApp(models, async (d) => ({ direccion: `${d}, Quito, Ecuador`, latitude: -0.1807, longitude: -78.4678 }));
    const response = await request(app).post("/api/auth/register").send(admin);
    token = response.body.token;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    config.googleMapsApiKey = originalKey;
  });
  after(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDatabase();
  });
  it("registra administrador, impide correo repetido e inicia sesi\xF3n", async () => {
    assert.ok(token);
    const duplicate = await request(app).post("/api/auth/register").send({ ...admin, cedula: cedula("171111111") });
    assert.equal(duplicate.status, 409);
    const login = await request(app).post("/api/auth/login").send({ correo: admin.correo, password: admin.password });
    assert.equal(login.status, 200);
    assert.equal(login.body.usuario.rol, "ADMINISTRADOR");
  });
  it("registra dos adultos, crea sus cuentas y bloquea el tercero", async () => {
    const one = await request(app).post("/api/adults").set("Authorization", `Bearer ${token}`).send(adult(1));
    assert.equal(one.status, 201);
    assert.equal(one.body.adulto.adultId, 1);
    const two = await request(app).post("/api/adults").set("Authorization", `Bearer ${token}`).send(adult(2));
    assert.equal(two.status, 201);
    const third = await request(app).post("/api/adults").set("Authorization", `Bearer ${token}`).send({ ...adult(1), cedula: cedula("110468793"), correo: "tercero@cuido.ec" });
    assert.equal(third.status, 409);
    assert.equal(third.body.code, "ADULT_LIMIT_REACHED");
    const adultLogin = await request(app).post("/api/auth/login").send({ correo: "adulto1@cuido.ec", password: "Temporal123" });
    assert.equal(adultLogin.body.usuario.rol, "ADULTO_MAYOR");
    assert.equal(adultLogin.body.usuario.adultId, 1);
  });
  it("lista, consulta y edita solo adultos propios", async () => {
    await request(app).post("/api/adults").set("Authorization", `Bearer ${token}`).send(adult(1));
    const list = await request(app).get("/api/adults").set("Authorization", `Bearer ${token}`);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.adultos[0].adultId, 1);
    const updated = { ...adult(1), telefono: "0991112233", direccion: "Calle Rosales 47" };
    delete updated.password;
    const edit = await request(app).put("/api/adults/1").set("Authorization", `Bearer ${token}`).send(updated);
    assert.equal(edit.status, 200);
    assert.equal(edit.body.adulto.telefono, "0991112233");
  });
  it("convierte una direcci\xF3n de Quito en coordenadas", async () => {
    const response = await request(app).post("/api/geocoding/address").set("Authorization", `Bearer ${token}`).send({ direccion: "La Carolina" });
    assert.equal(response.status, 200);
    assert.equal(response.body.latitude, -0.1807);
  });
  it("integra ubicaci\xF3n, zona segura y alertas usando el mismo adultId", async () => {
    await request(app).post("/api/adults").set("Authorization", `Bearer ${token}`).send(adult(1));
    const login = await request(app).post("/api/auth/login").send({ correo: "adulto1@cuido.ec", password: "Temporal123" });
    const adultToken = login.body.token;
    const zone = await request(app).post("/api/safe-zones").set("Authorization", `Bearer ${token}`).send({ adultId: 1, nombre: "Casa", direccion: "La Carolina", latitude: -0.1807, longitude: -78.4678, radio: 300 });
    assert.equal(zone.status, 201);
    assert.equal(zone.body.id_adulto, 1);
    const inside = await request(app).post("/api/locations").set("Authorization", `Bearer ${adultToken}`).send({ adultId: 1, latitude: -0.1807, longitude: -78.4678, accuracy: 12 });
    assert.equal(inside.status, 201);
    assert.equal(inside.body.estadoZona, "DENTRO_DE_ZONA");
    const outside = await request(app).post("/api/locations").set("Authorization", `Bearer ${adultToken}`).send({ adultId: 1, latitude: -0.17, longitude: -78.4678, accuracy: 18 });
    assert.equal(outside.body.estadoZona, "FUERA_DE_ZONA");
    assert.equal(outside.body.alerta.tipo, "FUERA_DE_ZONA");
    const latest = await request(app).get("/api/locations/1/latest").set("Authorization", `Bearer ${token}`);
    assert.equal(latest.body.adultId, 1);
    await request(app).post("/api/alerts").set("Authorization", `Bearer ${adultToken}`).send({ adultId: 1, tipo: "SOS", latitude: -0.17, longitude: -78.4678 });
    const alerts = await request(app).get("/api/alerts/1").set("Authorization", `Bearer ${token}`);
    assert.equal(alerts.body.length, 2);
    const update = await request(app).put(`/api/alerts/${alerts.body[0].id_alerta}/status`).set("Authorization", `Bearer ${token}`).send({ estado: "ATENDIDA" });
    assert.equal(update.body.estado, "ATENDIDA");
    const contacts = await request(app).get("/api/contacts/1").set("Authorization", `Bearer ${adultToken}`);
    assert.equal(contacts.body[0].telefono, "0987654321");
  });
  it("protege datos de adultos ajenos", async () => {
    await request(app).post("/api/adults").set("Authorization", `Bearer ${token}`).send(adult(1));
    const other = { ...admin, correo: "otra@cuido.ec", cedula: cedula("172222222") };
    const registered = await request(app).post("/api/auth/register").send(other);
    const denied = await request(app).get("/api/locations/1/latest").set("Authorization", `Bearer ${registered.body.token}`);
    assert.equal(denied.status, 403);
  });
  it("integra Google Routes y las cinco categor\xEDas de Places desde el servidor", async () => {
    config.googleMapsApiKey = "test-key";
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("computeRoutes")) return new Response(JSON.stringify({ routes: [{ duration: "420s", distanceMeters: 3100, polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ places: [{ id: "hospital-1", displayName: { text: "Hospital Metropolitano" }, formattedAddress: "Av. Mariana de Jes\xFAs, Quito", location: { latitude: -0.181, longitude: -78.48 }, types: ["hospital"] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const route = await request(app).post("/api/routes").set("Authorization", `Bearer ${token}`).send({ origin: { lat: -0.18, lng: -78.47 }, destination: { lat: -0.17, lng: -78.46 } });
    assert.equal(route.status, 200);
    assert.equal(route.body.distanciaMetros, 3100);
    for (const categoria of ["hospital", "farmacia", "centro_salud", "policia", "punto_ayuda"]) {
      const places = await request(app).post("/api/nearby-places").set("Authorization", `Bearer ${token}`).send({ latitude: -0.18, longitude: -78.47, categoria });
      assert.equal(places.status, 200);
    }
  });
});
