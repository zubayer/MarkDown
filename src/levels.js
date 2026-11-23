/*
 * Challenge content, validation rules and the syntax guide.
 *
 * Every check receives { doc, src }:
 *   doc - the rendered, sanitized preview element (query it like the DOM)
 *   src - the raw Markdown typed in the editor
 * and returns true when the requirement is met.
 */

const norm = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const text = (el) => norm(el && el.textContent);
const all = (doc, selector) => Array.from(doc.querySelectorAll(selector));
const some = (doc, selector, predicate = () => true) => all(doc, selector).some(predicate);
const includes = (el, needle) => text(el).includes(norm(needle));

/** Text of a list item without the text of any nested list. */
const ownText = (li) => {
  const clone = li.cloneNode(true);
  clone.querySelectorAll('ul, ol').forEach((list) => list.remove());
  return text(clone);
};

/** Direct child items of a list. */
const items = (list) => Array.from(list.children).filter((child) => child.tagName === 'LI');

/** Nested list (ul/ol) inside a list item, if any. */
const subList = (li) => li.querySelector(':scope > ul, :scope > ol');

export const levels = [
  {
    id: 'headings',
    title: 'Give it structure',
    category: 'Headings',
    mark: '#',
    description: 'Headings turn a wall of text into a document people can scan.',
    instructions:
      'Make <strong>My Recipe</strong> the level-1 title, then turn <strong>Ingredients</strong> and <strong>Steps</strong> into level-2 section headings.',
    hint: '# Main title\n\n## Section heading',
    starter: 'My Recipe\n\nA quick weeknight pasta that takes about twenty minutes.\n\nIngredients\n\nPasta, garlic, olive oil, chili flakes.\n\nSteps\n\nBoil, toss, serve.\n',
    checks: [
      { label: '“My Recipe” is a level-1 heading', test: ({ doc }) => some(doc, 'h1', (h) => text(h) === 'my recipe') },
      { label: 'There is only one level-1 heading', test: ({ doc }) => all(doc, 'h1').length === 1 },
      { label: '“Ingredients” is a level-2 heading', test: ({ doc }) => some(doc, 'h2', (h) => text(h) === 'ingredients') },
      { label: '“Steps” is a level-2 heading', test: ({ doc }) => some(doc, 'h2', (h) => text(h) === 'steps') },
    ],
  },
  {
    id: 'emphasis',
    title: 'Add emphasis',
    category: 'Text style',
    mark: '**',
    description: 'Bold, italic and strikethrough change how a reader hears a sentence.',
    instructions:
      'Make <strong>important</strong> bold, make <em>gently</em> italic, and strike through <s>$12</s> so readers see the new price.',
    hint: '**bold**   *italic*   ~~strikethrough~~',
    starter: 'This step is important: stir the sauce gently so it does not split.\n\nWas $12, now only $9.\n',
    checks: [
      { label: '“important” is bold', test: ({ doc }) => some(doc, 'strong, b', (el) => includes(el, 'important')) },
      { label: '“gently” is italic', test: ({ doc }) => some(doc, 'em, i', (el) => includes(el, 'gently')) },
      { label: '“$12” is struck through', test: ({ doc }) => some(doc, 's, del', (el) => includes(el, '$12')) },
      { label: '“$9” is not struck through', test: ({ doc }) => !some(doc, 's, del', (el) => includes(el, '$9')) },
    ],
  },
  {
    id: 'inline',
    title: 'Links and inline code',
    category: 'Inline elements',
    mark: '[ ]',
    description: 'Point readers somewhere useful, and show commands exactly as typed.',
    instructions:
      'Link the words <strong>Markdown Guide</strong> to <code>https://www.markdownguide.org</code>, and format <code>npm install</code> as inline code.',
    hint: '[link text](https://example.com)\n\nRun `command` in a terminal.',
    starter: 'New to the syntax? Read the Markdown Guide.\n\nThen run npm install to set up the project.\n',
    checks: [
      {
        label: '“Markdown Guide” is a link',
        test: ({ doc }) => some(doc, 'a', (a) => text(a) === 'markdown guide'),
      },
      {
        label: 'The link points to https://www.markdownguide.org',
        test: ({ doc }) =>
          some(doc, 'a', (a) => text(a) === 'markdown guide' && /^https:\/\/(www\.)?markdownguide\.org\/?/i.test(a.getAttribute('href') || '')),
      },
      {
        label: '“npm install” is inline code',
        test: ({ doc }) => some(doc, 'code', (c) => !c.closest('pre') && text(c) === 'npm install'),
      },
    ],
  },
  {
    id: 'lists',
    title: 'Bullets and numbers',
    category: 'Lists',
    mark: '1.',
    description: 'Use bullets when order does not matter and numbers when it does.',
    instructions:
      'Turn the three fruits into a <strong>bulleted</strong> list and the three method steps into a <strong>numbered</strong> list.',
    hint: '- apples\n- bananas\n\n1. First step\n2. Second step',
    starter: 'Shopping\n\napples\nbananas\ncherries\n\nMethod\n\nWash the fruit\nSlice it\nServe chilled\n',
    checks: [
      {
        label: 'The fruits are a bulleted list with 3 items',
        test: ({ doc }) => some(doc, 'ul', (ul) => items(ul).length >= 3 && ['apples', 'bananas', 'cherries'].every((f) => includes(ul, f))),
      },
      {
        label: 'The method is a numbered list with 3 items',
        test: ({ doc }) => some(doc, 'ol', (ol) => items(ol).length >= 3 && includes(ol, 'wash') && includes(ol, 'serve')),
      },
      {
        label: '“Wash the fruit” comes first',
        test: ({ doc }) => some(doc, 'ol', (ol) => items(ol)[0] && includes(items(ol)[0], 'wash')),
      },
    ],
  },
  {
    id: 'nested',
    title: 'Lists inside lists',
    category: 'Nested lists',
    mark: '  -',
    description: 'Indent items to group related ideas under a parent.',
    instructions:
      'Nest <strong>HTML</strong> and <strong>CSS</strong> under <strong>Frontend</strong>, and nest <strong>Node.js</strong> under <strong>Backend</strong>. Indent each child by two or more spaces.',
    hint: '- Parent\n  - Child one\n  - Child two',
    starter: '- Frontend\n- HTML\n- CSS\n- Backend\n- Node.js\n',
    checks: [
      {
        label: '“Frontend” has a nested list',
        test: ({ doc }) => some(doc, 'li', (li) => ownText(li).startsWith('frontend') && subList(li)),
      },
      {
        label: 'HTML and CSS are under Frontend',
        test: ({ doc }) =>
          some(doc, 'li', (li) => {
            const sub = ownText(li).startsWith('frontend') && subList(li);
            return sub && ['html', 'css'].every((n) => items(sub).some((c) => ownText(c) === n));
          }),
      },
      {
        label: 'Node.js is under Backend',
        test: ({ doc }) =>
          some(doc, 'li', (li) => {
            const sub = ownText(li).startsWith('backend') && subList(li);
            return sub && items(sub).some((c) => ownText(c) === 'node.js');
          }),
      },
      {
        label: 'Frontend and Backend stay at the top level',
        test: ({ doc }) => {
          const top = all(doc, 'ul, ol').find((l) => !l.closest('li'));
          return !!top && ['frontend', 'backend'].every((n) => items(top).some((li) => ownText(li).startsWith(n)));
        },
      },
    ],
  },
  {
    id: 'quotes',
    title: 'Quote a source',
    category: 'Blockquotes',
    mark: '>',
    description: 'Blockquotes set someone else’s words apart from your own.',
    instructions:
      'Put the quotation and its attribution in a single blockquote, with the attribution on its own line. Make <strong>Ada Lovelace</strong> bold.',
    hint: '> Quoted text\n>\n> — **Author**',
    starter: 'The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves.\n\n— Ada Lovelace\n',
    checks: [
      { label: 'The text is in a blockquote', test: ({ doc }) => some(doc, 'blockquote', (q) => includes(q, 'analytical engine')) },
      {
        label: 'The attribution is inside the same blockquote',
        test: ({ doc }) => some(doc, 'blockquote', (q) => includes(q, 'analytical engine') && includes(q, 'ada lovelace')),
      },
      {
        label: 'The attribution is on its own line',
        test: ({ doc }) =>
          some(doc, 'blockquote', (q) => {
            const lines = all(q, 'p').map(text);
            return lines.length >= 2 && lines.some((l) => l.includes('ada lovelace') && !l.includes('analytical'));
          }),
      },
      { label: '“Ada Lovelace” is bold', test: ({ doc }) => some(doc, 'blockquote strong, blockquote b', (b) => includes(b, 'ada lovelace')) },
    ],
  },
  {
    id: 'tables',
    title: 'Build a table',
    category: 'Tables',
    mark: '|',
    description: 'Tables line up data so readers can compare across rows.',
    instructions:
      'Turn the comma-separated data into a table with a header row of <strong>Language</strong>, <strong>Year</strong> and <strong>Creator</strong>. Right-align the Year column.',
    hint: '| Name | Count |\n| :--- | ----: |\n| A    |     1 |',
    starter: 'Language, Year, Creator\nPython, 1991, Guido van Rossum\nJavaScript, 1995, Brendan Eich\nRuby, 1995, Yukihiro Matsumoto\n',
    checks: [
      { label: 'There is a table', test: ({ doc }) => all(doc, 'table').length > 0 },
      {
        label: 'Header row is Language, Year, Creator',
        test: ({ doc }) => some(doc, 'table', (t) => all(t, 'thead th').map(text).join('|') === 'language|year|creator'),
      },
      { label: 'All 3 languages have a row', test: ({ doc }) => some(doc, 'table', (t) => all(t, 'tbody tr').length >= 3 && ['python', 'javascript', 'ruby'].every((l) => includes(t, l))) },
      {
        label: 'The Year column is right-aligned',
        test: ({ doc }) => some(doc, 'thead th.align-right', (th) => text(th) === 'year'),
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Track the work',
    category: 'Task lists',
    mark: '[x]',
    description: 'Task lists show what is done and what is left at a glance.',
    instructions:
      'Turn the release plan into a task list. Mark <strong>Write tests</strong> and <strong>Update docs</strong> as done and leave <strong>Publish release</strong> open.',
    hint: '- [x] Finished task\n- [ ] Open task',
    starter: '## Release plan\n\n- Write tests\n- Update docs\n- Publish release\n',
    checks: [
      { label: 'There are at least 3 tasks', test: ({ doc }) => all(doc, 'li.task-list-item').length >= 3 },
      {
        label: '“Write tests” is checked',
        test: ({ doc }) => some(doc, 'li.task-list-item', (li) => includes(li, 'write tests') && li.querySelector('input:checked')),
      },
      {
        label: '“Update docs” is checked',
        test: ({ doc }) => some(doc, 'li.task-list-item', (li) => includes(li, 'update docs') && li.querySelector('input:checked')),
      },
      {
        label: '“Publish release” is still open',
        test: ({ doc }) => some(doc, 'li.task-list-item', (li) => includes(li, 'publish release') && !li.querySelector('input:checked')),
      },
    ],
  },
  {
    id: 'code',
    title: 'Show some code',
    category: 'Fenced code',
    mark: '```',
    description: 'Fenced blocks keep code exactly as written and tell readers the language.',
    instructions:
      'Wrap the JavaScript in a fenced code block tagged <code>js</code>, and wrap the terminal command in a second block tagged <code>sh</code>.',
    hint: '```js\nconst x = 1;\n```',
    starter: 'Greet the user:\n\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n\nRun it with:\n\nnode greet.js\n',
    checks: [
      { label: 'The JavaScript is in a code block', test: ({ doc }) => some(doc, 'pre code', (c) => c.textContent.includes('console.log')) },
      {
        label: 'Its block is tagged js',
        test: ({ doc }) => some(doc, 'pre code', (c) => c.textContent.includes('console.log') && /language-(js|javascript)\b/.test(c.className)),
      },
      {
        label: 'Indentation is preserved',
        test: ({ doc }) => some(doc, 'pre code', (c) => /\n {2,}console\.log/.test(c.textContent)),
      },
      {
        label: 'The command is in a block tagged sh',
        test: ({ doc }) => some(doc, 'pre code', (c) => c.textContent.includes('node greet.js') && /language-(sh|bash|shell|console)\b/.test(c.className)),
      },
    ],
  },
  {
    id: 'readme',
    title: 'Ship a README',
    category: 'Putting it together',
    mark: 'MD',
    description: 'Combine everything into a README, plus a little safe HTML for extras.',
    instructions:
      'Write a README with a level-1 project name, an <strong>Installation</strong> section containing a <code>sh</code> code block, a <strong>Features</strong> section with at least three bullets, and a collapsible <code>&lt;details&gt;</code> FAQ with a <code>&lt;summary&gt;</code>. Finally, delete the <code>&lt;script&gt;</code> tag from the starter. The preview already strips it, but it doesn’t belong in a README.',
    hint: '## Installation\n\n```sh\nnpm install\n```\n\n<details>\n<summary>FAQ</summary>\n\nAnswer here.\n\n</details>',
    starter: 'Project name goes here\n\nA tiny tool that does one thing well.\n\n<script>alert("not today")</script>\n',
    checks: [
      { label: 'The project name is a level-1 heading', test: ({ doc }) => all(doc, 'h1').length === 1 && text(doc.querySelector('h1')).length > 0 },
      {
        label: 'An “Installation” section has a sh code block',
        test: ({ doc }) => {
          const h = all(doc, 'h2').find((el) => text(el) === 'installation');
          if (!h) return false;
          for (let el = h.nextElementSibling; el && el.tagName !== 'H2' && el.tagName !== 'H1'; el = el.nextElementSibling) {
            if (el.matches('pre') && el.querySelector('code[class*="language-sh"], code[class*="language-bash"], code[class*="language-shell"]')) return true;
          }
          return false;
        },
      },
      {
        label: 'A “Features” section has 3 or more bullets',
        test: ({ doc }) => {
          const h = all(doc, 'h2').find((el) => text(el) === 'features');
          if (!h) return false;
          for (let el = h.nextElementSibling; el && el.tagName !== 'H2' && el.tagName !== 'H1'; el = el.nextElementSibling) {
            if (el.matches('ul') && items(el).length >= 3) return true;
          }
          return false;
        },
      },
      { label: 'A <details> block has a <summary>', test: ({ doc }) => some(doc, 'details', (d) => d.querySelector('summary') && text(d.querySelector('summary')).length > 0) },
      { label: 'No <script> tag is left in the source', test: ({ src }) => !/<script\b/i.test(src) },
    ],
  },
];

export const syntaxGuide = [
  { name: 'Heading', syntax: '# Title\n## Section\n### Subsection', note: 'One to six # characters, then a space.' },
  { name: 'Bold and italic', syntax: '**bold**  *italic*  ***both***', note: 'Underscores work too: __bold__, _italic_.' },
  { name: 'Strikethrough', syntax: '~~no longer true~~', note: 'Two tildes on each side.' },
  { name: 'Link', syntax: '[link text](https://example.com)', note: 'Bare URLs like https://example.com link automatically.' },
  { name: 'Inline code', syntax: 'Run `npm test` now', note: 'Wrap short code in single backticks.' },
  { name: 'Bulleted list', syntax: '- Item\n- Item', note: 'Use -, * or + at the start of each line.' },
  { name: 'Numbered list', syntax: '1. First\n2. Second', note: 'The first number sets where the list starts.' },
  { name: 'Nested list', syntax: '- Parent\n  - Child', note: 'Indent children by two or more spaces.' },
  { name: 'Blockquote', syntax: '> Quoted text\n>\n> — Author', note: 'A line with only > keeps paragraphs in one quote.' },
  { name: 'Table', syntax: '| Left | Right |\n| :--- | ----: |\n| a    |     1 |', note: 'Colons in the divider row set column alignment.' },
  { name: 'Task list', syntax: '- [ ] To do\n- [x] Done', note: 'A space or an x inside the brackets.' },
  { name: 'Code block', syntax: '```js\nconsole.log("hi");\n```', note: 'Name the language right after the opening fence.' },
  { name: 'Image', syntax: '![Alt text](https://example.com/pic.png)', note: 'This preview shows the alt text instead of loading the file.' },
  { name: 'Safe HTML', syntax: '<details>\n<summary>More</summary>\n\nHidden text\n\n</details>', note: 'Leave a blank line before Markdown inside HTML blocks.' },
];
