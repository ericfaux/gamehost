import { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";

const BASE_URL = "https://gameledger.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamically add venue booking pages
  let venuePages: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();
    const { data: venues } = await supabase
      .from("venues")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (venues) {
      venuePages = venues.map((venue) => ({
        url: `${BASE_URL}/v/${venue.slug}/book`,
        lastModified: venue.updated_at ? new Date(venue.updated_at) : new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    // If database is unavailable, continue with static pages only
    console.error("Failed to fetch venues for sitemap:", error);
  }

  return [...staticPages, ...venuePages];
}
