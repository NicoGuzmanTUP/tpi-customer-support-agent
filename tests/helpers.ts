import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const AGENTES = [
  { id: "agente-1", nombre: "Agente Uno", area: "soporte" },
  { id: "agente-2", nombre: "Agente Dos", area: "facturacion" },
];

// Crea un directorio de datos aislado y lo configura para el módulo de incidencias.
export async function prepararDatos(): Promise<string> {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "tpi-datos-"));
  await fs.writeFile(
    path.join(directorio, "agentes.json"),
    JSON.stringify(AGENTES),
  );
  process.env.INCIDENCIAS_DATA_DIR = directorio;
  return directorio;
}

export async function leerTicketsGuardados(directorio: string) {
  try {
    const contenido = await fs.readFile(
      path.join(directorio, "tickets.json"),
      "utf8",
    );
    return JSON.parse(contenido);
  } catch {
    return [];
  }
}

export async function limpiarDatos(directorio: string): Promise<void> {
  delete process.env.INCIDENCIAS_DATA_DIR;
  await fs.rm(directorio, { recursive: true, force: true });
}
