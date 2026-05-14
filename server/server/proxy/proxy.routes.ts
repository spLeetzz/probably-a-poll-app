import type { FastifyPluginAsync } from "fastify";

const proxyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/deezer/search/artist", async (req, reply) => {
    const { q } = req.query as { q?: string };
    
    if (!q) {
      throw app.httpErrors.badRequest("Missing query parameter 'q'");
    }

    try {
      const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}`);
      
      if (!response.ok) {
        throw new Error(`Deezer API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return reply.send(data);
    } catch (err) {
      req.log.error(err);
      throw app.httpErrors.internalServerError("Failed to fetch from Deezer API");
    }
  });
};

export default proxyRoutes;
