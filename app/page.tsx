import { Chat } from '@/components/Chat';

export default function Home() {
  return (
    <main>
      <header className="page-header">
        <h1>Experiment results assistant</h1>
        <p>
          Ask questions about A/B tests. The model chooses a lookup; the numbers, rankings and charts are computed in
          code.
        </p>
      </header>
      <Chat />
      <footer className="page-footer">Personal project. All experiments and numbers are synthetic.</footer>
    </main>
  );
}
