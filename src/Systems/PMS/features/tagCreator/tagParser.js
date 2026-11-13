// Both upper and lower text use the same block format: separate dishes with
// a blank line. Within a dish's block, extra line breaks don't create a new
// dish or a forced line break in the output — the PDF generator already
// auto-wraps long text to fit the tag, so a title/description typed across
// a couple of lines (for readability while typing) still renders as one
// continuous title that wraps naturally, instead of being split into two
// separate tags.
function splitBlocks(raw) {
  if (!raw || !raw.trim()) return [];

  return raw
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean));
}

export function parseDishPairs(titlesRaw, descriptionsRaw) {
  const titleBlocks = splitBlocks(titlesRaw).map((lines) => lines.join(' '));
  const descriptionBlocks = splitBlocks(descriptionsRaw).map((lines) => lines.join('\n'));

  return titleBlocks
    .filter((title) => title.length > 0)
    .map((title, i) => ({
      title,
      description: descriptionBlocks[i] || '',
    }));
}
