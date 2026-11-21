type ReadingSection = { heading: string; level: 2 | 3; paragraphs: string[]; label: string; band: boolean };

/** Presentation only: retain complete paragraphs and custom Studio headings.
 * Adjacent standard ruler headings describe one placement and share one band.
 */
export function natalReadingSections(body: string) {
  const sections: ReadingSection[] = [];
  for (const block of body.split(/\n\s*\n/u)) {
    const heading = /^(#{2,3}) ([^\n]+)(?:\n([\s\S]*))?$/u.exec(block);
    if (heading) sections.push({ heading: heading[2], level: heading[1].length as 2 | 3,
      paragraphs: heading[3] ? [heading[3]] : [], label: "", band: false });
    else {
      if (!sections.length) sections.push({ heading: "", level: 2, paragraphs: [], label: "", band: false });
      sections.at(-1)!.paragraphs.push(block);
    }
  }
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const ruler = /^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn) in (\w+) · (chart ruler|ruler of the \d+(?:st|nd|rd|th) house)$/u.exec(section.heading);
    const next = sections[i + 1];
    const house = next && /^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn) in the (\d+(?:st|nd|rd|th) house) · (.+)$/u.exec(next.heading);
    if (ruler) {
      section.label = ruler[3];
      section.band = true;
      if (house && house[1] === ruler[1] && house[3] === ruler[3] && next.level === section.level) {
        section.heading = `${ruler[1]} in ${ruler[2]}, ${house[2]}`;
        section.paragraphs.push(...next.paragraphs);
        sections.splice(i + 1, 1);
      }
    } else if (/ rising$/u.test(section.heading)) section.label = "Rising sign";
    else if (/^(Sun|Moon|Venus) in \w+$/u.test(section.heading)) section.label = `${section.heading.split(" ")[0]} sign`;
    else if (/^Midheaven in /u.test(section.heading)) section.label = "Midheaven";
    else if (/ on the \d+(?:st|nd|rd|th) house$/u.test(section.heading)) section.label = section.heading.split(" on the ")[1];
  }
  // Older Studio templates placed the Sun second. The requested reading order
  // moves complete sections, never sentences within the saved passages.
  const approachOrder = ["Rising sign", "chart ruler", "Sun sign"];
  if (sections.length === 3 && approachOrder.every(label => sections.some(section => section.label === label))) {
    return approachOrder.map(label => sections.find(section => section.label === label)!);
  }
  return sections;
}
