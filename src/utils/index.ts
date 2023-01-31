export const canUseDom = Boolean(typeof window !== 'undefined' && window.document && window.document.createElement);

export const getPath = (url: string, data: Record<string, string>): string => {
  const params = Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === 'string'));
  const query = new URLSearchParams(params);
  return `${url}?${query.toString()}`;
};
