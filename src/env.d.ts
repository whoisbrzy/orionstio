/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  interface Locals {
    admin: string | null;
    /** Set by the middleware for public pages, so a page does not read storage twice. */
    site?: import("./lib/site").SiteData;
  }
}
