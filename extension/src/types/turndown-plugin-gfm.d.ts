// `turndown-plugin-gfm` ships no type declarations. It exports Turndown plugins
// (functions that receive a TurndownService instance), so a minimal declaration
// covering the named exports we use is sufficient.
declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  type Plugin = (service: TurndownService) => void;
  export const gfm: Plugin;
  export const tables: Plugin;
  export const strikethrough: Plugin;
  export const taskListItems: Plugin;
  export const highlightedCodeBlock: Plugin;
}
