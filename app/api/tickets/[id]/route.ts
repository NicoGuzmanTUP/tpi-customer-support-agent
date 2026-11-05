import { z } from "zod";
import {
  asignarAgente,
  cambiarEstado,
  ESTADOS_TICKET,
  IncidenciaError,
} from "@/app/lib/incidencias";

const cambioSchema = z.union([
  z.object({ estado: z.enum(ESTADOS_TICKET) }).strict(),
  z.object({ agenteId: z.string().min(1) }).strict(),
]);

const ESTADO_HTTP = { no_encontrado: 404, conflicto: 409 } as const;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const cuerpo = await req.json().catch(() => null);
  const cambio = cambioSchema.safeParse(cuerpo);
  if (!cambio.success) {
    return Response.json(
      { error: "Enviar solo estado o solo agenteId" },
      { status: 400 },
    );
  }

  try {
    const ticket =
      "estado" in cambio.data
        ? await cambiarEstado(params.id, cambio.data.estado)
        : await asignarAgente(params.id, cambio.data.agenteId);
    return Response.json(ticket);
  } catch (error) {
    if (error instanceof IncidenciaError) {
      return Response.json(
        { error: error.message },
        { status: ESTADO_HTTP[error.tipo] },
      );
    }
    throw error;
  }
}
