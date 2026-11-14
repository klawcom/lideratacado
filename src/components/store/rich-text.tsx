/** Renders the plain text edited in the settings: blank lines split paragraphs, "## " starts a heading. */
export function RichText({ text }: { text: string }) {
  const blocks = (text ?? "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-[17px] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines[0].startsWith("## ")) {
          return (
            <div key={i} className="space-y-1.5 pt-2">
              <h2 className="text-xl font-bold">{lines[0].slice(3)}</h2>
              {lines.slice(1).length > 0 && <p className="whitespace-pre-line text-muted-foreground">{lines.slice(1).join("\n")}</p>}
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-muted-foreground">
            {b}
          </p>
        );
      })}
    </div>
  );
}
