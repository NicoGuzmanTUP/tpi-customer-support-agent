import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const ESTADOS_TICKET = [
  "abierto",
  "en_progreso",
  "resuelto",
  "cerrado",
] as const;

export type EstadoTicket = (typeof ESTADOS_TICKET)[number];

export interface Agente {
  id: string;
  nombre: string;
  area: string;
}

export interface Ticket {
  id: string;
  consulta: string;
  motivo: string;
  estado: EstadoTicket;
  agenteId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FiltroTickets {
  estado?: EstadoTicket;
  agenteId?: string;
  texto?: string;
}

export class IncidenciaError extends Error {
  constructor(
    message: string,
    readonly tipo: "no_encontrado" | "conflicto",
  ) {
    super(message);
  }
}

const TRANSICIONES: Record<EstadoTicket, EstadoTicket[]> = {
  abierto: ["en_progreso", "cerrado"],
  en_progreso: ["abierto", "resuelto"],
  resuelto: ["en_progreso", "cerrado"],
  cerrado: [],
};

// Next puede cargar este módulo una vez por ruta. La cola global serializa
// las escrituras de todas las copias dentro del mismo proceso.
const almacen = globalThis as typeof globalThis & {
  colaIncidencias?: Promise<unknown>;
};

function directorioDatos(): string {
  return process.env.INCIDENCIAS_DATA_DIR ?? path.join(process.cwd(), "data");
}

async function leerJson<T>(archivo: string, valorInicial: T): Promise<T> {
  try {
    const contenido = await fs.readFile(
      path.join(directorioDatos(), archivo),
      "utf8",
    );
    return JSON.parse(contenido) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return valorInicial;
    }
    throw error;
  }
}

async function guardarTickets(tickets: Ticket[]): Promise<void> {
  const directorio = directorioDatos();
  const destino = path.join(directorio, "tickets.json");
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.mkdir(directorio, { recursive: true });
  await fs.writeFile(temporal, JSON.stringify(tickets, null, 2));
  await fs.rename(temporal, destino);
}

function leerTickets(): Promise<Ticket[]> {
  return leerJson<Ticket[]>("tickets.json", []);
}

function modificarTickets<T>(
  operacion: (tickets: Ticket[]) => T | Promise<T>,
): Promise<T> {
  const resultado = (almacen.colaIncidencias ?? Promise.resolve()).then(
    async () => {
      const tickets = await leerTickets();
      const valor = await operacion(tickets);
      await guardarTickets(tickets);
      return valor;
    },
  );
  almacen.colaIncidencias = resultado.catch(() => undefined);
  return resultado;
}

function buscarTicket(tickets: Ticket[], id: string): Ticket {
  const ticket = tickets.find((candidato) => candidato.id === id);
  if (!ticket) {
    throw new IncidenciaError(`No existe el ticket ${id}`, "no_encontrado");
  }
  return ticket;
}

export function crearTicket(consulta: string, motivo: string): Promise<Ticket> {
  return modificarTickets((tickets) => {
    const ahora = new Date().toISOString();
    const ticket: Ticket = {
      id: randomUUID(),
      consulta,
      motivo,
      estado: "abierto",
      agenteId: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    tickets.push(ticket);
    return ticket;
  });
}

export function cambiarEstado(
  id: string,
  estado: EstadoTicket,
): Promise<Ticket> {
  return modificarTickets((tickets) => {
    const ticket = buscarTicket(tickets, id);
    if (!TRANSICIONES[ticket.estado].includes(estado)) {
      throw new IncidenciaError(
        `No se puede pasar de ${ticket.estado} a ${estado}`,
        "conflicto",
      );
    }
    ticket.estado = estado;
    ticket.actualizadoEn = new Date().toISOString();
    return ticket;
  });
}

export function asignarAgente(id: string, agenteId: string): Promise<Ticket> {
  return modificarTickets(async (tickets) => {
    const ticket = buscarTicket(tickets, id);
    const agentes = await leerJson<Agente[]>("agentes.json", []);
    if (!agentes.some((agente) => agente.id === agenteId)) {
      throw new IncidenciaError(
        `No existe el agente ${agenteId}`,
        "no_encontrado",
      );
    }
    if (ticket.estado === "cerrado") {
      throw new IncidenciaError(
        "No se puede asignar un ticket cerrado",
        "conflicto",
      );
    }
    ticket.agenteId = agenteId;
    ticket.actualizadoEn = new Date().toISOString();
    return ticket;
  });
}

export async function filtrarTickets(
  filtro: FiltroTickets = {},
): Promise<Ticket[]> {
  const tickets = await leerTickets();
  const texto = filtro.texto?.toLowerCase();
  return tickets.filter(
    (ticket) =>
      (!filtro.estado || ticket.estado === filtro.estado) &&
      (!filtro.agenteId || ticket.agenteId === filtro.agenteId) &&
      (!texto ||
        ticket.consulta.toLowerCase().includes(texto) ||
        ticket.motivo.toLowerCase().includes(texto)),
  );
}
