import React from 'react';

/**
 * Parses inline markdown styles (bold, italic, inline code)
 */
function parseInline(text) {
  if (!text) return '';
  
  // Split by bold (**text** or __text__), italic (*text* or _text_), and inline code (`text`)
  const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <strong key={index} style={{ fontWeight: 700, color: 'var(--primary-950, #0f172a)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <em key={index} style={{ fontStyle: 'italic', color: 'var(--neutral-800, #334155)' }}>
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            color: 'var(--primary-800, #1e293b)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '11px',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

/**
 * Clean & beautiful Markdown renderer for LLM reasoning responses
 */
export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          style={{
            marginTop: '6px',
            marginBottom: '10px',
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {currentList.items.map((item, idx) => (
            <li key={idx} style={{ color: 'var(--neutral-800, #334155)', lineHeight: '1.5' }}>
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
    } else if (currentList.type === 'ol') {
      blocks.push(
        <ol
          key={`ol-${blocks.length}`}
          style={{
            marginTop: '6px',
            marginBottom: '10px',
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {currentList.items.map((item, idx) => (
            <li key={idx} style={{ color: 'var(--neutral-800, #334155)', lineHeight: '1.5', fontWeight: 500 }}>
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      blocks.push(
        <h4
          key={`h3-${idx}`}
          style={{
            fontSize: '14px',
            fontWeight: 750,
            color: 'var(--primary-900, #0f2747)',
            marginTop: '12px',
            marginBottom: '6px',
            borderBottom: '1px solid var(--primary-200, #cbd5e1)',
            paddingBottom: '4px',
          }}
        >
          {parseInline(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ')) {
      flushList();
      blocks.push(
        <h3
          key={`h2-${idx}`}
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--primary-900, #0f2747)',
            marginTop: '14px',
            marginBottom: '8px',
          }}
        >
          {parseInline(line.slice(3))}
        </h3>
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushList();
      blocks.push(
        <h2
          key={`h1-${idx}`}
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--primary-900, #0f2747)',
            marginTop: '16px',
            marginBottom: '10px',
          }}
        >
          {parseInline(line.slice(2))}
        </h2>
      );
      return;
    }

    // Unordered List (- item or * item)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.slice(2);
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Ordered List (1. item, 2. item, etc.)
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      const itemText = olMatch[2];
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Normal Paragraph
    flushList();
    blocks.push(
      <p
        key={`p-${idx}`}
        style={{
          marginTop: '4px',
          marginBottom: '8px',
          color: 'var(--neutral-800, #334155)',
          lineHeight: '1.55',
        }}
      >
        {parseInline(line)}
      </p>
    );
  });

  flushList();

  return <div className="markdown-body" style={{ width: '100%' }}>{blocks}</div>;
}
