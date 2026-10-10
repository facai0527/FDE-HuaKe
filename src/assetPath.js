// Public assets need the Vite base path when the app is served from a
// repository subpath such as /FDE-HuaKe/ on GitHub Pages.
export const assetPath = path =>
  `${import.meta.env.BASE_URL}${String(path).replace(/^\/+/, '')}`;
