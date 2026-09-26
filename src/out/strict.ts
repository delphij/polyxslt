// Strict mode: the result keeps no active content.  This is a small fixed policy, not a
// general HTML sanitizer; pages handling untrusted input should also use a Content
// Security Policy.
//
// Removed: elements that run or embed code or change how the page resolves URLs, SVG
// animation elements (they can rewrite attributes such as href), event handler attributes,
// srcdoc, and URL attributes whose scheme is javascript:, vbscript:, or data: other than
// data:image/.
const ELEMENTS = new Set([
  'animate',
  'animatemotion',
  'animatetransform',
  'applet',
  'base',
  'embed',
  'frame',
  'frameset',
  'iframe',
  'object',
  'script',
  'set',
]);

const URL_ATTRIBUTES = new Set([
  'action',
  'background',
  'cite',
  'data',
  'formaction',
  'href',
  'icon',
  'longdesc',
  'manifest',
  'ping',
  'poster',
  'src',
]);

// Browsers skip leading control characters and spaces and remove tabs and newlines when
// they parse a URL.  Removing every control character and space before the comparison is
// stricter still: it may reject a harmless URL, never accept a dangerous one.
function unsafeUrl(v: string): boolean {
  const u = v.replace(/[\0-\x20]/g, '').toLowerCase();
  return (
    u.startsWith('javascript:') ||
    u.startsWith('vbscript:') ||
    (u.startsWith('data:') && !u.startsWith('data:image/'))
  );
}

export function clean(root: ParentNode): void {
  for (const e of [...root.querySelectorAll('*')]) {
    const name = e.localName.toLowerCase();
    // Content parsed into a <template> is not reached by querySelectorAll.
    const content = (e as HTMLTemplateElement).content;
    if (content?.nodeType === 11) clean(content);
    if (ELEMENTS.has(name) || (name === 'meta' && e.hasAttribute('http-equiv'))) {
      e.remove();
      continue;
    }
    for (const a of [...e.attributes]) {
      const an = a.localName.toLowerCase();
      if (
        an.startsWith('on') ||
        an === 'srcdoc' ||
        (URL_ATTRIBUTES.has(an) && unsafeUrl(a.value))
      ) {
        e.removeAttributeNode(a);
      }
    }
  }
}
