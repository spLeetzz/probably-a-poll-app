export {}

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image?: string | null | undefined;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    creatorId: string;
  }
}
