// Makes project write-ups easier to scan without changing a word:
//   - numbers that carry a result (40%, $2,391, 200+, 0.74, 42 of 114, 3x) become <strong>
//   - a list item that opens with a short label and a colon ("Career Coffee Chats: ...")
//     gets that label in bold
// Works on the rendered HTML string; only text outside tags (and outside links, code and
// existing bold) is touched.

const NUM =
  /(\$\d[\d,]*(?:\.\d+)?\+?|\b\d+(?:\.\d+)?\s?%|\b\d[\d,]*\+|\b0\.\d+\b|\b\d+ of \d+\b|\b\d+(?:\.\d+)?x\b|\b\d{1,3}(?:,\d{3})+\b)/g;

export function emphasize(html: string): string {
  // 1. Lead-in labels in list items: <li>Label: rest</li>, label up to 48 characters, no tags.
  let out = html.replace(/<li>([^<:]{3,48}):\s/g, (_m, label: string) => `<li><strong>${label}:</strong> `);
  // 2. Numbers, in text nodes only.
  let skip = 0;
  out = out
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<(a|code|strong|b)\b/i.test(part)) skip++;
        else if (/^<\/(a|code|strong|b)>/i.test(part)) skip = Math.max(0, skip - 1);
        return part;
      }
      return skip ? part : part.replace(NUM, '<strong>$1</strong>');
    })
    .join('');
  return out;
}
