import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getAllPosts } from "@/lib/data/blogData";

const BASE_URL = "https://gameledger.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Homepage - highest priority
  const homePage: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // Main public pages - high priority
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Landing pages - high priority
  const landingPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/for-managers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/for-owners`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/features/inventory`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/features/reservations`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Blog posts - medium-high priority
  const blogPosts = getAllPosts();
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Auth pages - low priority
  const authPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamically add venue booking pages
  let venuePages: MetadataRoute.Sitemap = [];

  try {
    // Use anonymous client for public data - no cookies needed for static generation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
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

  return [
    ...homePage,
    ...mainPages,
    ...landingPages,
    ...blogPages,
    ...authPages,
    ...venuePages,
  ];
}
