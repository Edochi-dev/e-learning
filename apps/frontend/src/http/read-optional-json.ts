/**
 * Body JSON de una respuesta que puede no tener resultado.
 *
 * NestJS responde 200 con el body VACÍO cuando el handler devuelve null (no
 * con el texto "null"), y `res.json()` sobre un body vacío lanza SyntaxError.
 */
export async function readOptionalJson<T>(res: Response): Promise<T | null> {
    const body = await res.text();
    return body ? (JSON.parse(body) as T) : null;
}
