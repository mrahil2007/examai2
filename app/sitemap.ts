import { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://examai-in.com", lastModified: new Date(), priority: 1 },
    { url: "https://examai-in.com/webapp", lastModified: new Date(), priority: 0.8 },
    { url: "https://examai-in.com/privacy-policy", lastModified: new Date(), priority: 0.4 },
    { url: "https://examai-in.com/delete-account", lastModified: new Date(), priority: 0.4 },
  ];
}
