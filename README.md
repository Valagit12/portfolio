# portfolio

React + Vite portfolio, deployed to https://valagit12.github.io/portfolio/.

```sh
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve dist/ locally
```

- Components live in `src/components`, styles (Bootstrap 5 + SCSS) in `src/styles`.
- Project cards come from `src/data/projects.json`.
- Static files (images, PDFs, the Street Kombat X JS port) live in `public/` and are copied as-is.
- Pushing to `main` builds the site and publishes `dist/` to the `gh-pages` branch (`.github/workflows/deploy.yml`).
