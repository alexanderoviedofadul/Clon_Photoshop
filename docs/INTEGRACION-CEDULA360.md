# Integración Cédula 360 — API pública PhotoClone AI

Guía para que **Cédula 360** consuma el API v1 de PhotoClone AI en sus
funcionalidades para usuarios de **planes pagos** (separación de imágenes
en capas con IA, edición por texto y transformaciones raster).

> Contrato completo de endpoints: [`API-PUBLICA-V1.md`](API-PUBLICA-V1.md).
> Modo proxy validado en producción (consumidores externos con
> `c360_live_*` → `cedula360.tech/api/imagen/*`):
> [`VALIDACION-C360-IMAGEN-2026-06-12.md`](VALIDACION-C360-IMAGEN-2026-06-12.md).

## Credencial

- Se emitió una **API key dedicada** para Cédula 360 (owner
  `cedula360.tech`, scopes `decompose,edit,transform`, 120 req/min,
  cuota ilimitada).
- **La clave NO se versiona** (este repo es público). Se entrega fuera
  de banda y vive **solo server-side** en Cédula 360 como variable de
  entorno, p. ej. `PHOTOCLONE_API_KEY`.
- En PhotoClone solo se guarda su SHA-256 (no recuperable). Si se
  pierde/compromete: un administrador la **revoca y emite otra** desde
  `https://photoshop.cedula360.tech/admin` → pestaña **API Keys**.
- **Nunca** exponer la clave en el frontend ni en logs. Todas las
  llamadas deben salir del backend de Cédula 360.

## Base y autenticación

- Base URL: `https://photoshop.cedula360.tech/api/v1`
- Cabecera: `Authorization: Bearer $PHOTOCLONE_API_KEY`
  (alternativa equivalente: `X-API-Key: $PHOTOCLONE_API_KEY`)
- Respuestas: `{ "ok": true, ... }` o `{ "ok": false, "error", "code" }`
  con el HTTP real (`401` clave, `403` scope/revocada, `429` rate/cuota,
  `400` body, `502` IA).

## Flujo recomendado para planes pagos

1. El gateo por plan lo hace **Cédula 360 en su propia lógica** (verifica
   que el usuario tenga plan pago antes de llamar al API).
2. Backend de Cédula 360 → API PhotoClone (server-to-server, clave en
   env). El navegador del usuario nunca ve la clave.
3. Monitorear consumo con `GET /api/v1/usage`.

## Ejemplos

### Separar imagen en capas (IA)

```bash
curl -X POST https://photoshop.cedula360.tech/api/v1/decompose \
  -H "Authorization: Bearer $PHOTOCLONE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"image":"https://cedula360.tech/uploads/foto.jpg","layerCount":4}'
```

### Editar imagen con instrucción de texto (IA)

```bash
curl -X POST https://photoshop.cedula360.tech/api/v1/edit \
  -H "Authorization: Bearer $PHOTOCLONE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"image":"<url|dataURI|base64>","prompt":"cambia el fondo a azul corporativo"}'
```

### Transformación raster (sin coste IA)

```bash
curl -X POST https://photoshop.cedula360.tech/api/v1/transform \
  -H "X-API-Key: $PHOTOCLONE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"image":"<url|base64>","ops":[{"type":"grayscale"},{"type":"resize","width":512}],"format":"webp"}'
```

### Desde el backend de Cédula 360 (Node)

```js
async function decompose(imageUrl, layerCount = 4) {
  const r = await fetch('https://photoshop.cedula360.tech/api/v1/decompose', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PHOTOCLONE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: imageUrl, layerCount }),
  })
  const data = await r.json()
  if (!data.ok) throw new Error(`PhotoClone ${r.status}: ${data.error}`)
  return data.layers // [{ name, imageUrl, order }]
}
```

### Consultar uso/cuota

```bash
curl https://photoshop.cedula360.tech/api/v1/usage \
  -H "Authorization: Bearer $PHOTOCLONE_API_KEY"
# → { ok:true, key:{ owner, scopes, rate_per_min, monthly_quota,
#                     used_total, used_month, month, active } }
```

## Buenas prácticas

- Reintentos con backoff ante `429` (rate-limit/cuota) y `502` (IA).
- Cachear `imageUrl` de capas devueltas por `decompose` (las URLs de
  Replicate son temporales: descargar y persistir en almacenamiento de
  Cédula 360 si se necesitan a largo plazo).
- `transform` es síncrono y barato; `decompose`/`edit` tardan
  ~5-30 s (IA) — usar colas/jobs si el volumen es alto.
- Validar tamaño/tipo de imagen antes de enviar.

## Soporte / rotación de credenciales

- Alta/baja/rotación de claves: administrador de PhotoClone en
  `https://photoshop.cedula360.tech/admin` → **API Keys**.
- Contacto: info@cedula360.tech.
