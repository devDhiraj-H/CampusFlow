import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { typeDefs } from "./typeDefs.js";
import { resolvers, GraphQLContext } from "./resolvers.js";
import { verifyToken } from "../utils/jwt.js";
import { JWTPayload } from "../types/auth.types.js";
import type { Express } from "express";

export async function createAndMountApolloServer(
  app: Express
): Promise<ApolloServer<GraphQLContext>> {
  const apolloServer = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: true, // Explicitly enabled so Apollo Sandbox / Explorer / Playground can introspect schema in any environment
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: false,
      }),
    ],
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<GraphQLContext> => {
        const authHeader = req.headers.authorization;
        let user: JWTPayload | undefined;

        if (authHeader) {
          const parts = authHeader.split(" ");
          const token = parts.length === 2 ? parts[1] : authHeader;
          try {
            user = verifyToken(token);
          } catch {
            // Token invalid or expired; leave user undefined
          }
        }

        return { user };
      },
    })
  );

  return apolloServer;
}
