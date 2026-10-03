import { createOnrampServerKit, createSessionRouteHandler } from "@circle-fin/onramp-kit/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Arc Onramp session minting — only for a signed-in founder, only when ONRAMP_API_KEY is set. */
export async function POST(req: Request) {
  if (!process.env.ONRAMP_API_KEY) return Response.json({ error: "Onramp not configured (ONRAMP_API_KEY)" }, { status: 501 });
  const handler = createSessionRouteHandler(createOnrampServerKit({ apiKey: process.env.ONRAMP_API_KEY }), {
    authorize: async (request: Request) => {
      const cookie = request.headers.get("cookie") ?? "";
      const token = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split("=")[1];
      return !!verifySessionToken(token ? decodeURIComponent(token) : null);
    },
  } as Parameters<typeof createSessionRouteHandler>[1]);
  return handler(req);
}
