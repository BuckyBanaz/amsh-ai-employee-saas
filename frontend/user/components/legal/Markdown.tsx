import React from 'react';

/** A small, safe renderer for policy text: headings, lists, quotes, paragraphs, **bold**, *italic* and [links](https://...).
 *  Everything is rendered as React text (never as HTML), and only http(s) and mailto links are kept. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('*')) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok) ?? [];
      out.push(/^(https?:|mailto:)/i.test(href ?? '')
        ? <a key={key} href={href} className="text-[#0066FF] underline" rel="noopener noreferrer" target="_blank">{label}</a>
        : tok);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => { if (para.length) { nodes.push(<p key={`p${nodes.length}`} className="my-3 leading-relaxed text-gray-700">{inline(para.join(' '), `p${nodes.length}`)}</p>); para = []; } };
  const flushList = () => { if (list.length) { nodes.push(<ul key={`l${nodes.length}`} className="my-3 list-disc space-y-1 pl-6 text-gray-700">{list.map((t, i) => <li key={i}>{inline(t, `l${nodes.length}-${i}`)}</li>)}</ul>); list = []; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(); flushList();
      const cls = h[1].length === 1 ? 'mt-6 mb-3 text-2xl font-bold text-gray-900' : h[1].length === 2 ? 'mt-6 mb-2 text-lg font-bold text-gray-900' : 'mt-4 mb-2 text-base font-semibold text-gray-900';
      nodes.push(React.createElement(`h${h[1].length}`, { key: `h${nodes.length}`, className: cls }, inline(h[2], `h${nodes.length}`)));
    } else if (/^\s*[-*]\s+/.test(line)) { flushPara(); list.push(line.replace(/^\s*[-*]\s+/, '')); }
    else if (/^>\s?/.test(line)) { flushPara(); flushList(); nodes.push(<blockquote key={`q${nodes.length}`} className="my-3 border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{inline(line.replace(/^>\s?/, ''), `q${nodes.length}`)}</blockquote>); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(line.trim()); }
  }
  flushPara(); flushList();
  return <div>{nodes}</div>;
}
