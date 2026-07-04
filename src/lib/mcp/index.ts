import { defineMcp } from "@lovable.dev/mcp-js";
import listPortfolioTool from "./tools/list-portfolio";
import listCategoriesTool from "./tools/list-categories";

export default defineMcp({
  name: "blackpixal-mcp",
  title: "BLACK PIXAL Portfolio",
  version: "0.1.0",
  instructions:
    "Read-only access to the BLACK PIXAL portfolio catalog. Use `list_categories` to discover categories, then `list_portfolio` (optionally filtered by category) to fetch published work items with media URLs.",
  tools: [listPortfolioTool, listCategoriesTool],
});
