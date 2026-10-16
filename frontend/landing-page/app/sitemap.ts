import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://getamsh.com";
  const now = new Date();

  const routes = [
    "",
    "/pilot",
    "/ai-appointment-booking",
    "/ai-receptionist-for-dentists",
    "/ai-receptionist-for-clinics",
    "/ai-answering-service-medical",
    "/dental-answering-service",
    "/ai-phone-answering-service",
    "/ai-receptionist-whatsapp",
    "/docs",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/pilot" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/pilot" ? 0.9 : 0.8,
  }));
}
