# Marcos Donizeti Faria Advogados

Site estático — Direito Previdenciário e Trabalhista (Santos/SP).

## Páginas

- `/` — landing principal
- `/links` — hub para bio do Instagram (WhatsApp, Maps, Instagram, site)

## Logo

- `logo.png` / `logo_light.png` (raiz) — arquivos-fonte com qualidade
- `assets/logo.png` — fundos claros
- `assets/logo-light.png` — fundos escuros (uso no site)
- `favicon.png` (raiz) — favicon oficial; copiado para `assets/favicon.png`

## Desenvolvimento local

Abra `index.html` no navegador ou sirva a pasta:

```bash
npx serve .
```

## Deploy na Vercel

1. Envie o projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Framework Preset: **Other** (sem build).
4. Root Directory: `.` (raiz do projeto).
5. Deploy.

Ou via CLI:

```bash
npx vercel
```

## Configurar Instagram

Quando o perfil existir, edite `js/main.js` e preencha:

```js
var INSTAGRAM_URL = "https://instagram.com/SEU_USUARIO";
```

Todos os links com `data-instagram` passam a apontar para essa URL.

## Contato

- WhatsApp: (13) 99749-7278
- E-mail: marcosfaria.advocacia@gmail.com
- OAB/SP 180.764
