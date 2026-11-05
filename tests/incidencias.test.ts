import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  asignarAgente,
  cambiarEstado,
  crearTicket,
  filtrarTickets,
  IncidenciaError,
} from "@/app/lib/incidencias";
import { GET } from "@/app/api/tickets/route";
import { PATCH } from "@/app/api/tickets/[id]/route";
import { leerTicketsGuardados, limpiarDatos, prepararDatos } from "./helpers";

let directorio: string;

beforeEach(async () => {
  directorio = await prepararDatos();
});

afterEach(async () => {
  await limpiarDatos(directorio);
});

describe("módulo de incidencias", () => {
  it("devuelve una lista vacía si todavía no hay archivo de tickets", async () => {
    expect(await filtrarTickets()).toEqual([]);
  });

  it("crea un ticket abierto, sin agente, y lo persiste", async () => {
    const ticket = await crearTicket("No puedo ingresar", "Problema de cuenta");

    expect(ticket).toMatchObject({
      consulta: "No puedo ingresar",
      motivo: "Problema de cuenta",
      estado: "abierto",
      agenteId: null,
    });
    expect(await leerTicketsGuardados(directorio)).toEqual([ticket]);
  });

  it("conserva todos los tickets creados en paralelo", async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => crearTicket(`Consulta ${i}`, "x")),
    );

    expect(await leerTicketsGuardados(directorio)).toHaveLength(10);
  });

  it("permite el ciclo abierto, en progreso, resuelto y cerrado", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    await cambiarEstado(id, "en_progreso");
    await cambiarEstado(id, "resuelto");
    const ticket = await cambiarEstado(id, "cerrado");

    expect(ticket.estado).toBe("cerrado");
  });

  it("rechaza transiciones no permitidas con un conflicto", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    await expect(cambiarEstado(id, "resuelto")).rejects.toMatchObject({
      tipo: "conflicto",
    });
  });

  it("no guarda cambios cuando la operación falla", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    await cambiarEstado(id, "resuelto").catch(() => undefined);

    const [ticket] = await leerTicketsGuardados(directorio);
    expect(ticket.estado).toBe("abierto");
  });

  it("asigna un agente existente", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    const ticket = await asignarAgente(id, "agente-2");

    expect(ticket.agenteId).toBe("agente-2");
  });

  it("rechaza agentes inexistentes y tickets inexistentes", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    await expect(asignarAgente(id, "agente-x")).rejects.toBeInstanceOf(
      IncidenciaError,
    );
    await expect(asignarAgente("no-existe", "agente-1")).rejects.toMatchObject({
      tipo: "no_encontrado",
    });
  });

  it("no asigna agentes a tickets cerrados", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");
    await cambiarEstado(id, "cerrado");

    await expect(asignarAgente(id, "agente-1")).rejects.toMatchObject({
      tipo: "conflicto",
    });
  });

  it("filtra por estado, agente y texto sin distinguir mayúsculas", async () => {
    const primero = await crearTicket("Error en FACTURA", "Facturación");
    await crearTicket("Cambio de clave", "Cuenta");
    await asignarAgente(primero.id, "agente-1");

    expect(await filtrarTickets({ texto: "factura" })).toHaveLength(1);
    expect(await filtrarTickets({ agenteId: "agente-1" })).toHaveLength(1);
    expect(await filtrarTickets({ estado: "abierto" })).toHaveLength(2);
    expect(await filtrarTickets({ estado: "cerrado" })).toEqual([]);
  });
});

describe("rutas de tickets", () => {
  function patch(id: string, cuerpo: unknown) {
    return PATCH(
      new Request(`http://localhost/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(cuerpo),
      }),
      { params: { id } },
    );
  }

  it("GET filtra tickets y valida el filtro", async () => {
    await crearTicket("Consulta", "Motivo");

    const ok = await GET(new Request("http://localhost/api/tickets?estado=abierto"));
    const invalido = await GET(new Request("http://localhost/api/tickets?estado=zzz"));

    expect(ok.status).toBe(200);
    expect(await ok.json()).toHaveLength(1);
    expect(invalido.status).toBe(400);
  });

  it("PATCH cambia estado o asigna agente", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    const conEstado = await patch(id, { estado: "en_progreso" });
    const conAgente = await patch(id, { agenteId: "agente-1" });

    expect(conEstado.status).toBe(200);
    expect(await conAgente.json()).toMatchObject({
      estado: "en_progreso",
      agenteId: "agente-1",
    });
  });

  it("PATCH traduce errores a 400, 404 y 409", async () => {
    const { id } = await crearTicket("Consulta", "Motivo");

    expect((await patch(id, { estado: "resuelto", agenteId: "agente-1" })).status).toBe(400);
    expect((await patch("no-existe", { estado: "cerrado" })).status).toBe(404);
    expect((await patch(id, { estado: "resuelto" })).status).toBe(409);
  });
});
