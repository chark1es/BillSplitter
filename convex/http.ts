import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Enable CORS for client-side authentication requests
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
