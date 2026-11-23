import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';

import { EditorState } from '@codemirror/state';
import { EditorView, keymap, drawSelection, highlightActiveLine, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Circle, CircleCheck, CodeXml, Eye,
  FileText, Info, Keyboard, Lightbulb, ListChecks, ListTree, PartyPopper, RotateCcw,
  ShieldAlert, ShieldCheck, Target, Trophy, X,
} from 'lucide';

import { levels, syntaxGuide } from './levels.js';
import { renderMarkdown } from './markdown.js';

/* ---------------- Icons ---------------- */

const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'book-open': BookOpen,
  check: Check,
  'chevron-down': ChevronDown,
  circle: Circle,
  'circle-check': CircleCheck,
  'code-xml': CodeXml,
  eye: Eye,
  'file-text': FileText,
  info: Info,
  keyboard: Keyboard,
  lightbulb: Lightbulb,
  'list-checks': ListChecks,
  'list-tree': ListTree,
  'party-popper': PartyPopper,
  'rotate-ccw': RotateCcw,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  target: Target,
  trophy: Trophy,
  x: X,
};

function iconMarkup(name) {
  return (ICONS[name] || '').replace('<svg', '<svg aria-hidden="true" focusable="false"');
}

function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) {
    if (el.dataset.iconRendered === el.dataset.icon) continue;
    el.innerHTML = iconMarkup(el.dataset.icon);
    el.dataset.iconRendered = el.dataset.icon;
    el.classList.add('icon');
  }
}

/* ---------------- State (kept in memory for this session only) ---------------- */

const POINTS_PER_LEVEL = 10;
const state = {
  index: 0,
  drafts: levels.map((level) => level.starter),
  completed: new Set(),
  justCompleted: false,
};

/* ---------------- Elements ---------------- */

const $ = (id) => document.getElementById(id);
const el = {
  score: $('score'),
  progress: $('progress'),
  progressLabel: $('progress-label'),
  mobileProgress: $('mobile-progress'),
  levels: $('levels'),
  badge: $('level-badge'),
  category: $('category'),
  title: $('lesson-title'),
  description: $('lesson-description'),
  instructions: $('instructions'),
  briefMark: $('brief-mark'),
  hintToggle: $('hint-toggle'),
  hintLabel: $('hint-label'),
  hint: $('hint'),
  hintText: $('hint-text'),
  prev: $('prev'),
  next: $('next'),
  nextLabel: $('next-label'),
  reset: $('reset'),
  editor: $('editor'),
  editorStats: $('editor-stats'),
  preview: $('preview'),
  sanitizerStatus: $('sanitizer-status'),
  sanitizerLabel: $('sanitizer-label'),
  checks: $('checks'),
  checkSummary: $('check-summary'),
  lessonCounter: $('lesson-counter'),
  guide: $('guide'),
  openGuide: $('open-guide'),
  syntaxList: $('syntax-list'),
  resetDialog: $('reset-dialog'),
  pathToggle: document.querySelector('.path-toggle'),
  pathContent: $('path-content'),
  validation: document.querySelector('.validation'),
};

/* ---------------- Editor ---------------- */

const highlight = HighlightStyle.define([
  { tag: t.heading, color: 'var(--syntax-heading)', fontWeight: '700' },
  { tag: t.strong, fontWeight: '700', color: 'var(--syntax-strong)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--syntax-strong)' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--syntax-link)' },
  { tag: t.monospace, color: 'var(--syntax-code)' },
  { tag: t.quote, color: 'var(--syntax-quote)', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.contentSeparator, t.list], color: 'var(--syntax-mark)' },
  { tag: [t.angleBracket, t.tagName, t.attributeName], color: 'var(--syntax-html)' },
  { tag: t.meta, color: 'var(--syntax-mark)' },
]);

let suppressUpdate = false;

const view = new EditorView({
  parent: el.editor,
  state: EditorState.create({
    doc: state.drafts[0],
    extensions: [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      markdown(),
      syntaxHighlighting(highlight),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor', 'data-testid': 'input-markdown-editor' }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressUpdate) {
          state.drafts[state.index] = update.state.doc.toString();
          scheduleRefresh();
        }
      }),
    ],
  }),
});

function setEditorText(value) {
  suppressUpdate = true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
    selection: { anchor: 0 },
    scrollIntoView: true,
  });
  suppressUpdate = false;
}

/* ---------------- Rendering ---------------- */

let refreshTimer = 0;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 60);
}

function refresh() {
  const src = view.state.doc.toString();
  const level = levels[state.index];

  // Preview
  const { fragment, removed } = renderMarkdown(src);
  el.preview.replaceChildren(fragment);

  if (removed > 0) {
    el.sanitizerStatus.classList.add('warn');
    el.sanitizerStatus.querySelector('[data-icon]').dataset.icon = 'shield-alert';
    el.sanitizerLabel.textContent = `${removed} unsafe item${removed === 1 ? '' : 's'} removed`;
  } else {
    el.sanitizerStatus.classList.remove('warn');
    el.sanitizerStatus.querySelector('[data-icon]').dataset.icon = 'shield-check';
    el.sanitizerLabel.textContent = 'HTML sanitized';
  }

  // Editor stats
  const lines = view.state.doc.lines;
  el.editorStats.textContent = `${lines} line${lines === 1 ? '' : 's'} · ${src.length} character${src.length === 1 ? '' : 's'}`;

  // Validation
  const results = level.checks.map((check) => {
    let ok = false;
    try {
      ok = Boolean(check.test({ doc: el.preview, src }));
    } catch {
      ok = false;
    }
    return { label: check.label, ok };
  });

  el.checks.replaceChildren(
    ...results.map(({ label, ok }) => {
      const li = document.createElement('li');
      li.className = ok ? 'check pass' : 'check';
      li.innerHTML = `<span class="check-icon" data-icon="${ok ? 'circle-check' : 'circle'}"></span><span class="check-label"></span><span class="visually-hidden">${ok ? 'Passed' : 'Not yet'}</span>`;
      li.querySelector('.check-label').textContent = label;
      return li;
    }),
  );

  const passed = results.filter((r) => r.ok).length;
  const allPassed = passed === results.length;

  if (allPassed && !state.completed.has(level.id)) {
    state.completed.add(level.id);
    state.justCompleted = true;
  }

  const done = state.completed.has(level.id);
  el.validation.classList.toggle('complete', allPassed);
  if (allPassed) {
    el.checkSummary.innerHTML = state.justCompleted
      ? `<span data-icon="party-popper"></span> Level complete! +${POINTS_PER_LEVEL} points`
      : `<span data-icon="circle-check"></span> All ${results.length} checks passed`;
  } else {
    el.checkSummary.textContent = `${passed} of ${results.length} checks passed${done ? ' · points already earned' : ''}`;
  }

  updateProgress();
  hydrateIcons();
}

function updateProgress() {
  const count = state.completed.size;
  el.score.textContent = String(count * POINTS_PER_LEVEL);
  el.progress.value = count;
  el.progressLabel.textContent = `${count} / ${levels.length} complete`;
  el.mobileProgress.textContent = `${count}/${levels.length}`;

  for (const button of el.levels.querySelectorAll('.level-link')) {
    const level = levels[Number(button.dataset.index)];
    const isDone = state.completed.has(level.id);
    button.classList.toggle('done', isDone);
    const status = button.querySelector('.level-status');
    status.dataset.icon = isDone ? 'circle-check' : 'circle';
    button.querySelector('.visually-hidden').textContent = isDone ? ' (completed)' : '';
  }
}

/* ---------------- Learning path ---------------- */

function buildPath() {
  el.levels.replaceChildren(
    ...levels.map((level, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'level-link';
      button.dataset.index = String(index);
      button.dataset.testid = `button-level-${index + 1}`;
      button.innerHTML = `
        <span class="level-num">${String(index + 1).padStart(2, '0')}</span>
        <span class="level-text"><span class="level-title"></span><span class="level-cat"></span></span>
        <span class="level-status" data-icon="circle"></span>
        <span class="visually-hidden"></span>`;
      button.querySelector('.level-title').textContent = level.title;
      button.querySelector('.level-cat').textContent = level.category;
      button.addEventListener('click', () => {
        goTo(index, { focusTitle: true });
        closePathOnMobile();
      });
      return button;
    }),
  );
}

function closePathOnMobile() {
  if (window.matchMedia('(max-width: 960px)').matches) {
    el.pathToggle.setAttribute('aria-expanded', 'false');
    document.querySelector('.path').classList.remove('open');
  }
}

el.pathToggle.addEventListener('click', () => {
  const open = el.pathToggle.getAttribute('aria-expanded') !== 'true';
  el.pathToggle.setAttribute('aria-expanded', String(open));
  document.querySelector('.path').classList.toggle('open', open);
});

/* ---------------- Level navigation ---------------- */

function setHint(open) {
  el.hint.hidden = !open;
  el.hintToggle.setAttribute('aria-expanded', String(open));
  el.hintLabel.textContent = open ? 'Hide hint' : 'Show hint';
}

function goTo(index, { focusTitle = false } = {}) {
  state.index = (index + levels.length) % levels.length;
  state.justCompleted = false;
  const level = levels[state.index];
  const number = String(state.index + 1).padStart(2, '0');

  el.badge.textContent = `LEVEL ${number}`;
  el.category.textContent = level.category.toUpperCase();
  el.title.textContent = level.title;
  el.description.textContent = level.description;
  el.instructions.innerHTML = level.instructions;
  el.briefMark.textContent = level.mark;
  el.hintText.innerHTML = '';
  const pre = document.createElement('pre');
  pre.textContent = level.hint;
  el.hintText.append(pre);
  setHint(false);

  el.lessonCounter.textContent = `${number} / ${levels.length}`;
  el.prev.disabled = state.index === 0;
  el.nextLabel.textContent = state.index === levels.length - 1 ? 'Back to start' : 'Next level';

  for (const button of el.levels.querySelectorAll('.level-link')) {
    const active = Number(button.dataset.index) === state.index;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }

  setEditorText(state.drafts[state.index]);
  refresh();
  el.preview.scrollTop = 0;
  if (focusTitle) el.title.focus();
}

el.prev.addEventListener('click', () => goTo(state.index - 1));
el.next.addEventListener('click', () => goTo(state.index + 1));
el.hintToggle.addEventListener('click', () => setHint(el.hint.hidden));

/* ---------------- Reset ---------------- */

el.reset.addEventListener('click', () => {
  if (state.drafts[state.index] === levels[state.index].starter) {
    view.focus();
    return;
  }
  el.resetDialog.returnValue = '';
  el.resetDialog.showModal();
});

el.resetDialog.addEventListener('close', () => {
  if (el.resetDialog.returnValue === 'reset') {
    state.drafts[state.index] = levels[state.index].starter;
    state.justCompleted = false;
    setEditorText(state.drafts[state.index]);
    refresh();
    view.focus();
  }
});

/* ---------------- Syntax guide ---------------- */

function buildGuide() {
  const nodes = [];
  for (const entry of syntaxGuide) {
    const dt = document.createElement('dt');
    dt.textContent = entry.name;
    const dd = document.createElement('dd');
    const pre = document.createElement('pre');
    pre.textContent = entry.syntax;
    const note = document.createElement('p');
    note.textContent = entry.note;
    dd.append(pre, note);
    nodes.push(dt, dd);
  }
  el.syntaxList.replaceChildren(...nodes);
}

el.openGuide.addEventListener('click', () => el.guide.showModal());
el.guide.addEventListener('click', (event) => {
  // Close when clicking the backdrop.
  if (event.target === el.guide) el.guide.close();
});

/* ---------------- Keyboard shortcuts ---------------- */

document.addEventListener('keydown', (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    goTo(state.index + 1);
  } else if (event.key === 'ArrowLeft' && state.index > 0) {
    event.preventDefault();
    goTo(state.index - 1);
  }
});

/* ---------------- Start ---------------- */

buildPath();
buildGuide();
hydrateIcons();
goTo(0);
