import ReactMarkdown from 'react-markdown';

export function StackPosition({ markdown }: { markdown: string }) {
  return (
    <section className="space-y-2">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Where it sits in the stack
      </h3>
      <div className="max-w-[72ch] space-y-2 text-body leading-snug text-neutral-700">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p>{children}</p>,
            strong: ({ children }) => (
              <strong className="font-medium text-neutral-900">{children}</strong>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </section>
  );
}
