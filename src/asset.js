// Resolve a file in /public against the deploy base path (e.g. /portfolio/)
export const asset = (path) => `${import.meta.env.BASE_URL}${path}`;
