import { createCanvasMiddleware } from "@/lib/middleware";
import { initSession } from "@/lib/auth";

initSession("ye-weather");

export const middleware = createCanvasMiddleware({
  appId: "ye-weather",
  publicRoutes: ["/api/widgets/", "/api/cards/", "/api/inter-app/", "/embed/timeline/", "/embed/widget/"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
