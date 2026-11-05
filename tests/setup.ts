import { afterEach, beforeEach, vi } from "vitest";

// El código original escribe muchos logs. Se silencian para que la salida
// de las pruebas muestre solo resultados.
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});
