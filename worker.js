export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Permanently move the old workers.dev hostname to the custom domain.
    if (url.hostname === "easytools.easytoolssupport.workers.dev") {
      url.hostname = "lovepdfi.com";
      return Response.redirect(url.toString(), 301);
    }

    // Serve the static site for the custom domain.
    return env.ASSETS.fetch(request);
  },
};
