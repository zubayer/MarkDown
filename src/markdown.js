import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

/*
 * Markdown rendering for the live preview.
 *
 * - GitHub-flavored extras: tables, strikethrough, autolinks and task lists.
 * - Raw HTML is allowed in the source, then sanitized with a strict policy:
 *   no scripts, embedded content, forms, inline styles or event attributes.
 * - Links may only use http, https, mailto or in-page (#) targets.
 * - Images never load remote files; they render as a labelled placeholder
 *   showing their alt text.
 */

const md = new MarkdownIt({ html: true, linkify: true, typographer: false, breaks: false });

/* ---------- Task lists: "- [ ] item" and "- [x] item" ---------- */
const TASK_RE = /^\[([ xX])\]\s+/;

md.core.ruler.after('inline', 'task-lists', (state) => {
  const tokens = state.tokens;
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    if (inline.type !== 'inline') continue;
    if (tokens[i - 1].type !== 'paragraph_open' || tokens[i - 2].type !== 'list_item_open') continue;
    const first = inline.children && inline.children[0];
    if (!first || first.type !== 'text' || !TASK_RE.test(first.content)) continue;

    const checked = first.content[1].toLowerCase() === 'x';
    first.content = first.content.replace(TASK_RE, '');

    const box = new state.Token('html_inline', '', 0);
    box.content = `<input type="checkbox" class="task-checkbox" disabled${checked ? ' checked' : ''}> `;
    inline.children.unshift(box);

    tokens[i - 2].attrJoin('class', 'task-list-item');

    // Mark the parent list so bullets can be hidden.
    for (let j = i - 3; j >= 0; j--) {
      const t = tokens[j];
      if ((t.type === 'bullet_list_open' || t.type === 'ordered_list_open') && t.level === tokens[i - 2].level - 1) {
        t.attrJoin('class', 'contains-task-list');
        break;
      }
    }
  }
});

/* ---------- Table alignment: turn style="text-align" into classes ---------- */
for (const rule of ['th_open', 'td_open']) {
  md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const style = token.attrGet('style');
    if (style) {
      const match = style.match(/text-align:\s*(left|right|center)/);
      token.attrs = token.attrs.filter(([name]) => name !== 'style');
      if (match) token.attrJoin('class', `align-${match[1]}`);
    }
    return self.renderToken(tokens, idx, options);
  };
}

/* ---------- Fenced code: keep the language class ---------- */
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = (token.info || '').trim().split(/\s+/)[0];
  const cls = lang ? ` class="language-${md.utils.escapeHtml(lang)}"` : '';
  const label = lang ? ` data-lang="${md.utils.escapeHtml(lang)}"` : '';
  return `<pre${label}><code${cls}>${md.utils.escapeHtml(token.content)}</code></pre>\n`;
};

/* ---------- Sanitizer policy ---------- */
const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 'dt',
  'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'ins', 'kbd', 'li',
  'mark', 'ol', 'p', 'pre', 's', 'samp', 'small', 'span', 'strong', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'var',
];

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'class', 'id', 'type', 'checked', 'disabled', 'open',
  'start', 'colspan', 'rowspan', 'align', 'data-lang', 'lang', 'dir',
];

const SAFE_URL = /^(?:https?:|mailto:|#)/i;

const purifier = DOMPurify(window);

purifier.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'type' && node.nodeName === 'INPUT' && data.attrValue !== 'checkbox') {
    data.keepAttr = false;
  }
  if (data.attrName === 'href' && !SAFE_URL.test(data.attrValue.trim())) {
    data.keepAttr = false;
  }
});

purifier.addHook('afterSanitizeElements', (node) => {
  if (node.nodeName === 'INPUT' && node.getAttribute('type') !== 'checkbox') {
    node.remove();
  }
});

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  RETURN_DOM_FRAGMENT: true,
};

/** Replace images with a placeholder that shows the alt text and loads nothing. */
function neutralizeImages(fragment) {
  for (const img of fragment.querySelectorAll('img')) {
    const alt = (img.getAttribute('alt') || '').trim();
    const box = document.createElement('span');
    box.className = 'image-placeholder';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', alt || 'Image');
    box.textContent = alt ? `Image: ${alt}` : 'Image (no alt text)';
    img.replaceWith(box);
  }
}

function decorateLinks(fragment) {
  for (const a of fragment.querySelectorAll('a[href]')) {
    if (a.getAttribute('href').startsWith('#')) continue;
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
}

/**
 * Render Markdown to a sanitized DocumentFragment.
 * @returns {{ fragment: DocumentFragment, removed: number }}
 */
export function renderMarkdown(source) {
  const html = md.render(source);
  const fragment = purifier.sanitize(html, PURIFY_CONFIG);
  // Count elements and attributes the sanitizer stripped. DOMPurify also
  // reports the <body> wrapper it discards when returning a fragment; skip it.
  const removed = purifier.removed.filter(
    (entry) => entry.attribute || (entry.element && entry.element.nodeName !== 'BODY'),
  ).length;
  neutralizeImages(fragment);
  decorateLinks(fragment);
  return { fragment, removed };
}
