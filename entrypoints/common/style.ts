const Template = (css: string) =>
  `.insight-word-enable insight-word.insight-word-highlight {
    /*  修改下面样式 */
${css
  .split("\n")
  .filter((i) => i.trim() !== "")
  .map((i) => "    " + i.trim())
  .join("\n")}
    /*  结束 */
}`;

export const PRESET_HIGHLIGHT_STYLE = [
  Template(`
  text-shadow: 0 0 5px #ade30b, 0 0 5px #ade30b
`),
  Template(`
    text-decoration: rgba(10, 163, 205, 0.491) wavy underline;
`),
  Template(`
    background-color: rgba(10, 163, 205, 0.491);
`),
  Template(`
filter: drop-shadow(0 0 3px #ade30b) drop-shadow(0 0 3px #ade30b);
`),
];
export const DEFAULT_HIGHLIGHT_STYLE = PRESET_HIGHLIGHT_STYLE[0];
