# LinoRoute Studio

Un espacio creativo de IA de código abierto para generar imágenes y vídeos. Incluye generación desde texto e imágenes, bibliotecas de prompts y una pequeña galería local en el navegador.

Idiomas: [English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Español · [Français](README.fr.md)

## Enlaces

- **Demo en línea:** [studio.linoroute.com](https://studio.linoroute.com)
- **API compatible recomendada:** [LinoRoute](https://linoroute.com)
- **Documentación:** [ninoroute.com/tutorials](https://ninoroute.com/tutorials/00-intro)

Puedes explorar la interfaz y los prompts sin clave. La generación real requiere tu propia API Key. Los adaptadores usan LinoRoute por defecto; otros proveedores requieren comprobar modelos, rutas y formatos de respuesta.

## Capturas

![Espacio de imágenes](screenshots/image-workspace.png)

![Espacio de vídeo](screenshots/video-workspace.png)

![Diseño móvil](screenshots/mobile-image-workspace.png)

## Funciones

- Generación de imágenes GPT-image con imágenes de referencia
- Modelos de vídeo Seedance, MiniMax, Kling, Veo y Gemini
- Controles de proporción, resolución, calidad y duración según el modelo
- Bibliotecas de prompts para imágenes y vídeos
- Obras y archivos locales en el navegador
- Almacenamiento OSS opcional mediante URLs firmadas

## Seguridad

No publiques API Keys en el repositorio ni en variables `VITE_*`/`NEXT_PUBLIC_*`. Las claves de OSS deben permanecer en el firmador del servidor. Consulta [`SECURITY.md`](SECURITY.md).

## Desarrollo

```bash
bun install
cp .env.example .env.local
bun run dev
```

Puedes cambiar la URL pública compatible con `STUDIO_API_UPSTREAM`. La licencia es [AGPL v3 o posterior](LICENSE).
