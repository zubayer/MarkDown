# Markdown Lab

[Open the live app](https://markd.pplx.app)

Markdown Lab is an interactive practice app with a side-by-side editor and live preview. Its ten challenges cover headings, emphasis, links, inline code, ordered and unordered lists, nested lists, blockquotes, tables, task lists, fenced code, and safe custom HTML. The last challenge combines several of those skills in a README.

Each level gives feedback while you type and awards 10 points on first completion. Drafts and scores are kept in browser memory and reset when you reload. The app is fully static and needs no account, backend, API keys, or environment variables.

## Run locally

Install Node.js and npm, then run these commands from the `markdown-lab` directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To build for deployment:

```sh
npm run build
```

The static site is generated in `dist/`. For a static hosting service that builds from GitHub, set the build command to `npm ci && npm run build` and the output directory to `dist`.

## Push to GitHub

Create an empty GitHub repository without an initial README or `.gitignore`. Extract the ZIP and, from the `markdown-lab` directory, run:

```sh
git init -b main
git add .
git commit -m "Initial Markdown Lab release"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the example remote with your repository URL. The included `.gitignore` excludes `node_modules/` and `dist/`; GitHub needs the source and lockfile, not the generated files.

## Source layout

- `index.html`: Application shell, editor and preview panels, and dialogs.
- `src/app.js`: Editor setup, lesson navigation, and session scoring.
- `src/levels.js`: Challenge content, validation rules, and the syntax guide.
- `src/markdown.js`: Markdown rendering and the custom HTML sanitization policy.
- `src/styles.css`: Responsive layout and visual styles.
