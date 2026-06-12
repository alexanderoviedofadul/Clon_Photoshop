# Validación integración Cédula 360 → PhotoClone — 2026-06-12

Cédula 360 expone proxies bajo `https://cedula360.tech/api/imagen/*` que
gatean por plan y reenvían a la **API v1 de PhotoClone**
([`API-PUBLICA-V1.md`](API-PUBLICA-V1.md)). Documenta la validación
end-to-end con una clave real de Cédula 360.

## Arquitectura de la alianza (dos niveles)

```
                  CLAVE DEL CONSUMIDOR                  CLAVE OPERATIVA
                  ──────────────────                    ──────────────
                                                       (NUNCA SE EXPONE)

Usuario / app  ──c360_live_*──▶  cedula360.tech       ──ck_live_*──▶  photoshop.cedula360.tech
                                 /api/imagen/{...}                     /api/v1/{...}
                                  · valida plan                         · valida scope
                                  · gateo por cuota diaria              · rate-limit + cuota
                                  · proxy a PhotoClone                  · ejecuta IA / sharp
```

- **Lado A — Direct (server-to-server)**: el backend de Cédula 360
  llama directamente a PhotoClone v1 con su clave **`ck_live_*`**
  (documentado en [`INTEGRACION-CEDULA360.md`](INTEGRACION-CEDULA360.md)).
- **Lado B — Proxy (recomendado para usuarios finales)**: los
  consumidores externos llaman a **`cedula360.tech/api/imagen/*`** con
  su clave **`c360_live_*`**. C360 valida plan + cuota, traduce y
  reenvía a PhotoClone con la `ck_live_*` que **nunca abandona el
  servidor**.

Ambos modos comparten la misma implementación de PhotoClone — la mejora
del *safety checker* aplicada en
[`FIX-DECOMPOSE-SAFETY-CHECKER-2026-06-12.md`](FIX-DECOMPOSE-SAFETY-CHECKER-2026-06-12.md)
beneficia automáticamente al proxy de Cédula 360.

## Endpoints validados en producción

Base: `https://cedula360.tech/api/imagen` · Auth: cabecera
`X-API-Key: c360_live_*`.

| Método | Ruta | Coste | Tope (plan despachos) |
|---|---|---|---|
| GET | `/usage` | — | informa diariamente |
| POST | `/decompose` | 1 IA | `ia.tope_diario` (120/día) |
| POST | `/edit` | 1 IA | `ia.tope_diario` |
| POST | `/transform` | sharp local | `transform.tope_diario` (800/día) |

### Contrato — mismo que la API v1 de PhotoClone

`decompose`, `edit` y `transform` aceptan los mismos campos que la API
v1 (ver [`API-PUBLICA-V1.md`](API-PUBLICA-V1.md)). La respuesta también
se conserva: `decompose` → `{ ok, layers, processingTimeMs }`,
`edit` → `{ ok, editedImageUrl, processingTimeMs }`,
`transform` → `{ ok, image, format, width, height, bytes }`.

### Forma de `/usage`

```json
{
  "ok": true,
  "plan": "despachos",
  "habilitado": true,
  "ia":        { "usado_hoy": 0, "tope_diario": 120 },
  "transform": { "usado_hoy": 0, "tope_diario": 800 }
}
```

`habilitado: false` ⇒ el plan no incluye `/api/imagen` (responde 403 en
acciones).

## Resultados de la prueba (clave real, 2026-06-12)

Clave de prueba: `c360_live_*****` (plan `despachos`, role admin) —
**no versionada por seguridad**.

| Paso | Resultado |
|---|---|
| `GET /api/usuario/me` (validar la clave) | 200 — plan `despachos` |
| `GET /api/imagen/usage` (estado inicial) | `ia 0/120`, `transform 0/800` |
| `POST /api/imagen/transform` (grayscale + resize → PNG 300×400) | 200, ~1 s |
| **`POST /api/imagen/decompose` (foto Unsplash, layerCount=4)** | **200, 4 capas, 8.2 s** |
| `POST /api/imagen/edit` (cambia el fondo a azul) | 200, 3.5 s |
| `GET /api/imagen/usage` post-consumo | `ia 2/120` ✓, `transform 1/800` ✓ |
| `POST .../transform` sin clave | 401 / 429 |
| `POST .../usage` con clave inválida | 401 / 429 |

El test de regresión del safety checker confirma el fix: con `c360_live`
real, la imagen completamente neutra ahora devuelve **4 capas** (antes
del fix devolvía 1 por el bug del checker).

## Códigos de error del proxy

| HTTP | Significado |
|---|---|
| 400 | Body inválido (falta `image`, `prompt` u `ops`) |
| 401 | Sin clave / clave inválida |
| 403 | Plan no habilitado o clave revocada |
| 429 | Tope diario alcanzado o rate-limit del WAF |
| 502 | Error en el motor IA aguas arriba |

## Buenas prácticas para el consumidor

- Los `imageUrl` que devuelven `decompose` / `edit` son URLs efímeras
  de `replicate.delivery`. **Descargar y persistir** si se necesitan a
  largo plazo.
- `transform` es síncrono (<1 s típico); `decompose` 5-15 s; `edit` 3-10 s.
  Usar colas si el volumen es alto.
- Llamar **siempre desde el backend** del consumidor. La clave
  `c360_live_*` no debe vivir en el navegador.
- Consultar `/api/imagen/usage` para monitorear consumo y prevenir 429.

## Cómo se relaciona con el resto de la docs

- [`API-PUBLICA-V1.md`](API-PUBLICA-V1.md) — contrato de los endpoints
  internos de PhotoClone (los que el proxy reenvía).
- [`INTEGRACION-CEDULA360.md`](INTEGRACION-CEDULA360.md) — modo
  directo `ck_live_*` para llamadas server-to-server del backend de
  Cédula 360.
- Este documento — modo proxy `c360_live_*` para clientes/usuarios
  externos de Cédula 360 (la opción recomendada).
