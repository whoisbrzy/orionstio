export interface Project {
  /** Used for the link and the image alt fallback. */
  slug: string;
  name: string;
  /** What the studio did, for example "Brand identity". */
  service: string;
  year: number;
  summary: string;
  /** Path under /public, for example "/work/acme.webp". */
  image?: string;
  imageAlt?: string;
}

// Add real projects here. The page shows an honest empty state until there are some.
export const projects: Project[] = [];
