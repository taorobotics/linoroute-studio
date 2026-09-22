# LinoRoute Studio

Un espace créatif IA open source pour générer des images et des vidéos. Studio prend en charge la génération depuis du texte ou des images, les bibliothèques de prompts et une galerie locale dans le navigateur.

Langues : [English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · Français

## Liens

- **Démo en ligne :** [studio.linoroute.com](https://studio.linoroute.com)
- **API compatible recommandée :** [LinoRoute](https://linoroute.com)
- **Documentation API :** [ninoroute.com/tutorials](https://ninoroute.com/tutorials/00-intro)

L’interface et les prompts sont consultables sans clé. La génération réelle nécessite votre propre clé API. Les adaptateurs ciblent LinoRoute ; un autre fournisseur doit proposer des modèles, routes et réponses compatibles.

## Captures d'écran

![Espace image](screenshots/image-workspace.png)

![Espace vidéo](screenshots/video-workspace.png)

![Interface mobile](screenshots/mobile-image-workspace.png)

## Fonctionnalités

- Génération d'images GPT-image et images de référence
- Modèles vidéo Seedance, MiniMax, Kling, Veo et Gemini
- Ratio, résolution, qualité et durée adaptés au modèle
- Bibliothèques de prompts pour images et vidéos
- Œuvres et fichiers locaux dans le navigateur
- Stockage OSS optionnel via des URL signées

## Sécurité

Ne publiez jamais de clé API dans le dépôt ou dans des variables `VITE_*`/`NEXT_PUBLIC_*`. Les clés OSS doivent rester sur le serveur de signature. Voir [`SECURITY.md`](SECURITY.md).

## Développement

```bash
bun install
cp .env.example .env.local
bun run dev
```

La base URL compatible peut être modifiée avec `STUDIO_API_UPSTREAM`. Le projet est sous [AGPL v3 ou ultérieure](LICENSE).
