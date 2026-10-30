// Serves the build at the hostname used to deploy this copy.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
