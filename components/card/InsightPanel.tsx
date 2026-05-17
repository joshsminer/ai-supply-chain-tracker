import ReactMarkdown from 'react-markdown';

export function InsightPanel({ markdown }: { markdown: string }) {
  return (
    <section
      className="rounded-r-md border-l-[3px] border-insight-border bg-insight-bg px-3.5 py-3"
      style={{ borderLeftColor: '#BA7517' }}
    >
      <h3 className="mb-1.5 text-micro font-medium uppercase tracking-wider text-insight-label">
        Insight
      </h3>
      <div className="prose-insight space-y-2 text-[13px] leading-[1.55] text-insight-fg">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p>{children}</p>,
            strong: ({ children }) => (
              <strong className="font-medium">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-insight-label"
              >
                {children}
              </a>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </section>
  );
}
