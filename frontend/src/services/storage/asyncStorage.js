const memory = new Map();
export const storage = {
  get: async (key) => memory.get(key) ?? null,
  set: async (key, value) => memory.set(key, value),
  remove: async (key) => memory.delete(key),
};

