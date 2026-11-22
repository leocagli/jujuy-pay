# Spec · Alertas geoespaciales Jujuy (Tren Solar)

Fecha: 2026-11-22 · Versión viva en el doc compartido del equipo.

## Objetivo y alcance

El MVP convierte telemetría geoespacial del tren, clima y satélite en alertas que llegan por WhatsApp y se ven en el front 3D. La demo cubre el flujo completo: dato, regla, aviso.

| Dato | Fuente | En el MVP |
| --- | --- | --- |
| Posición, pasajeros y energía del tren | Telemetría propia sobre una traza GeoJSON de la Quebrada | Simulado |
| Lluvia y viento por coordenada | Open-Meteo | Real |
| Focos de calor | NASA FIRMS (satélite) | Real con MAP_KEY; sin clave, archivo de ejemplo |
| Ocupación por pueblo | Modelo propio | Simulado |
| Avisos y consultas | Twilio WhatsApp Sandbox | Real |

Fuera de alcance: base de datos persistente, pagos, procesamiento de imágenes satelitales (queda como extra) y un número de WhatsApp Business propio.

## Arquitectura

```text
 Usuarios en WhatsApp <--mensajes--> Twilio WhatsApp Sandbox
                                            ^
                                            | webhook y avisos
                                            v
 Front 3D (Blas) <------ JSON ------> API de Next (Agustín) ----> Open-Meteo  (lluvia y viento)
 escena 3D y panel                    /api/telemetry          ----> NASA FIRMS  (focos de calor)
 de alertas                           /api/weather            ----> Telemetría  (tren simulado)
                                      /api/fires
                                      /api/alerts
                                      /api/subscribe
                                      /api/notify
                                      /api/whatsapp
                                      Motor de reglas de alerta
```

El front y WhatsApp solo hablan con la API de Next; ella consulta clima, satélite y telemetría, y decide cuándo avisar.

## Fuentes de datos

El satélite entra por NASA FIRMS (focos de calor) y el clima por Open-Meteo; ambos tienen acceso gratuito. Las imágenes satelitales (por ejemplo vegetación o inundación con Sentinel-2) quedan como extra y no se verificaron en esta investigación.

| Fuente | Qué aporta a la alerta | Acceso | Límites |
| --- | --- | --- | --- |
| [Open-Meteo](https://open-meteo.com/) | Lluvia horaria, viento y temperatura por coordenada: riesgo de crecida y ráfagas | `https://api.open-meteo.com/v1/forecast`, sin clave | Gratis para uso no comercial hasta 10.000 llamadas diarias; pide atribución (CC BY 4.0) |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/csv) | Focos de calor satelitales dentro de un rectángulo (VIIRS a 375 m, MODIS a 1 km) | `/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA]/[DAY_RANGE]` con MAP_KEY gratis | Registro previo; límite de 5.000 transacciones cada 10 minutos por clave |
| [Twilio WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/quickstart/node) | Canal de entrada y salida por WhatsApp | Cuenta Twilio y mensaje `join <código>` desde cada teléfono | Número compartido por todos los usuarios; fuera de la ventana de 24 horas solo plantillas |
| Telemetría del tren | Posición, pasajeros, kW solares | Simulada en `lib/telemetry.ts` | Sin hardware real |

Plan B por conectividad: guardar una respuesta real de cada API en `data/fixtures/` y que la API de Next use ese archivo si la llamada falla.

## Reparto de tareas

Blas hace el front, Agustín la API de Next y Leo coordina y cuenta con las cuentas externas. Lo primero es congelar los tipos compartidos en `lib/types.ts`, así Blas y Agustín trabajan en paralelo sin esperarse.

| # | Tarea | Dueño | Listo cuando |
| --- | --- | --- | --- |
| 1 | Congelar alcance, tipos compartidos y contrato de rutas (este doc) | Leo | Los tres aprobaron los tipos |
| 2 | Crear cuenta Twilio, activar el Sandbox y armar el QR de `join` | Leo | Un teléfono de prueba recibe respuesta |
| 3 | Pedir la MAP_KEY de FIRMS | Leo | La clave responde un `area` de prueba |
| 4 | Guion del pitch y demo de 3 minutos, con el mensaje de impacto en turismo y economías regionales | Leo | Ensayo cronometrado |
| 5 | Traza GeoJSON del tren, pueblos y helpers geoespaciales (`lib/geo.ts`) | Agustín | Función de distancia punto a traza probada |
| 6 | `GET /api/telemetry` con datos simulados | Agustín | Devuelve el JSON del contrato |
| 7 | `GET /api/weather` (proxy de Open-Meteo con caché) y `GET /api/fires` (FIRMS con respaldo en fixture) | Agustín | Ambos responden sin internet usando fixtures |
| 8 | `GET /api/alerts`: motor de reglas de crecida, fuego y aglomeración | Agustín | Genera al menos una alerta por regla con datos de ejemplo |
| 9 | `POST /api/whatsapp` (webhook de Twilio con validación de firma) y `POST /api/notify` | Agustín | Un mensaje "alertas" devuelve la lista actual |
| 10 | Consumir `/api/telemetry` y `/api/alerts` con mocks hasta que la API esté lista | Blas | El front corre con datos mock y con la API real cambiando una variable |
| 11 | Tren sobre la traza en la escena 3D y marcadores de alertas por pueblo | Blas | Una alerta nueva aparece en la escena |
| 12 | Panel de alertas con severidad y suscripción (número de WhatsApp y pueblo) con el QR del Sandbox | Blas | Alguien se suscribe desde la pantalla |
| 13 | Botón "simular mensaje" para la demo si falla la conectividad | Blas | La demo corre sin WhatsApp real |
| 14 | Integración, PR y prueba final de punta a punta | Leo | Flujo completo de dato a aviso en el celular |

Reglas de repo: dependencias con versión exacta y sin vulnerabilidades conocidas (el proyecto ya trae `save-exact=true` en `.npmrc`), y las claves van en `.env.local`, nunca en el repo.

## Contratos de API

Todas las rutas viven en el App Router de Next y devuelven JSON, salvo el webhook de Twilio, que responde TwiML. Este es el modelo de alerta que comparten front y API:

```ts
type Severity = "info" | "warning" | "critical";
type AlertKind = "flood" | "fire" | "crowding";

interface Alert {
  id: string;
  kind: AlertKind;
  severity: Severity;
  town: string;
  message: string;
  location: { lat: number; lng: number };
  issuedAt: string; // ISO 8601
  source: "open-meteo" | "firms" | "telemetry";
}
```

| Método y ruta | Devuelve | Dueño |
| --- | --- | --- |
| `GET /api/telemetry` | Posición del tren, pasajeros, kW solares y ocupación por pueblo | Agustín |
| `GET /api/weather?town=` | Lluvia y viento de las próximas horas para un pueblo | Agustín |
| `GET /api/fires` | Focos de calor cercanos a la traza o a los pueblos | Agustín |
| `GET /api/alerts` | Lista de `Alert` vigentes, ordenadas por severidad | Agustín |
| `POST /api/subscribe` | Registra número de WhatsApp y pueblo | Agustín |
| `POST /api/notify` | Envía una alerta a los suscriptos del pueblo por Twilio | Agustín |
| `POST /api/whatsapp` | Webhook de Twilio: responde TwiML según el comando recibido | Agustín |

Reglas iniciales de alerta (los umbrales son una propuesta para calibrar):

| Tipo | Se dispara cuando | Severidad |
| --- | --- | --- |
| `flood` | La lluvia acumulada de las próximas 6 horas en un pueblo supera 10 mm | `warning`; `critical` si supera el doble |
| `fire` | Hay un foco de FIRMS a menos de 10 km de la traza o de un pueblo | `warning`; `critical` si está a menos de 3 km |
| `crowding` | La ocupación de un pueblo llega al 90% | `info`, con sugerencia de pueblo alternativo |

Comandos de WhatsApp: `alertas`, `alertas <pueblo>`, `suscribir <pueblo>` y `baja`. Para validar que el POST viene de Twilio se usa su firma HMAC-SHA1 sobre el webhook.

### Contratos concretos (fuente de verdad: `lib/types.ts`)

```ts
type DataSourceMode = "live" | "fixture";
type Point = { lat: number; lng: number };

interface TrainState {
  location: Point;
  passengers: number;
  solarKw: number;
  batteryPct: number;
  progress: number; // 0..1 sobre la traza
}
interface TownOccupancy {
  town: string;
  occupancyPct: number;
  alternativeTown?: string; // pueblo con menor ocupación
}
interface TelemetryResponse {
  train: TrainState;
  occupancy: TownOccupancy[];
  updatedAt: string;
}

interface WeatherHour {
  time: string; // ISO local de Open-Meteo
  precipitationMm: number;
  windKph: number;
  temperatureC: number;
}
interface WeatherResponse {
  town: string;
  location: Point;
  hours: WeatherHour[]; // próximas 6 horas
  next6hPrecipitationMm: number;
  source: DataSourceMode;
  fetchedAt: string;
}

interface FireHotspot {
  id: string;
  location: Point;
  detectedAt: string; // ISO 8601
  confidence: string;
  frp: number | null;
}
interface FiresResponse {
  fires: FireHotspot[];
  source: DataSourceMode;
  fetchedAt: string;
}

interface AlertsResponse {
  alerts: Alert[]; // critical -> warning -> info
  generatedAt: string;
}

interface SubscribeRequest { phone: string; town: string } // E.164 y pueblo de la traza
interface SubscribeResponse { ok: true; phone: string; town: string }
interface NotifyRequest { alert: Alert }
interface NotifyResponse { recipients: number; sent: number; failed: number }
```

Errores: toda ruta JSON responde `{ "error": string }` con el estado HTTP adecuado (400 entrada inválida, 404 pueblo inexistente, 503 proveedor sin credenciales). El webhook responde TwiML con `Content-Type: text/xml`.

### Decisiones de implementación

- Los suscriptores viven en memoria (`lib/subscribers.ts`): alcanza para la demo local y se descarta al reiniciar; no hay base de datos (fuera de alcance).
- El repo tiene `cacheComponents: true`: las rutas usan `connection()` para ejecutarse por request y el caché se declara con `use cache`/`cacheLife` (Open-Meteo 10 min, FIRMS 1 h, con tags `weather` y `fires`). Si fallan, se sirven `data/fixtures/open-meteo.json` y `data/fixtures/firms.csv` con `source: "fixture"`.
- `FIRMS_MAP_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` y el opcional `TWILIO_WEBHOOK_URL` van en `.env.local`. Sin `MAP_KEY` se usa el fixture; sin credenciales de Twilio, `/api/notify` responde 503.
- La firma del webhook se valida con HMAC-SHA1 sobre la URL pública y los parámetros ordenados; si no está `TWILIO_WEBHOOK_URL`, se usa la URL de la request. La comparación es de tiempo constante.

## Orden de trabajo y riesgos

El camino crítico es contrato, API con fixtures, front sobre la API y recién después WhatsApp real. Cada paso deja algo demostrable.

1. Contrato y tipos compartidos aprobados (tarea 1). Mientras tanto, Leo abre las cuentas de Twilio y FIRMS (2 y 3).
2. API con datos simulados y fixtures (5 a 8) y front sobre mocks (10 y 11), en paralelo.
3. Front apuntando a la API real y panel de alertas (12).
4. Webhook y avisos por WhatsApp (9), con el botón de simulación como respaldo (13).
5. Integración, ensayo del pitch y PR (4 y 14).

| Riesgo | Qué hacemos |
| --- | --- |
| Internet inestable en la Quebrada | Fixtures guardados de cada API y caché en las rutas; el front corre con mocks |
| Twilio no puede llamar a `localhost` | Exponer el webhook con un túnel (ngrok o cloudflared) o usar el botón "simular mensaje" |
| Cada tester debe unirse al Sandbox | QR de `join` en pantalla y en el pitch; probar antes con los tres teléfonos del equipo |
| La MAP_KEY de FIRMS tarda o falla | Usar el fixture de focos de calor y avisar en la demo que es un ejemplo |
| El alcance crece | Imágenes satelitales y base de datos quedan fuera hasta que el flujo completo funcione |

Preguntas abiertas: quién es el dueño del repo `jujuy-pay` para aprobar el PR, y si la demo incluye teléfonos reales del jurado.
