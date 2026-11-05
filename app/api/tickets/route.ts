import { z } from "zod";
import { ESTADOS_TICKET, filtrarTickets } from "@/app/lib/incidencias";

export const dynamic = "force-dynamic";

const filtroSchema = z.object({
  estado: z.enum(ESTADOS_TICKET).optional(),
  agenteId: z.string().min(1).optional(),
  texto: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  const parametros = Object.fromEntries(new URL(req.url).searchParams);
  const filtro = filtroSchema.safeParse(parametros);
  if (!filtro.success) {
    return Response.json({ error: "Filtro inválido" }, { status: 400 });
  }
  return Response.json(await filtrarTickets(filtro.data));
}
