export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🔬 Research Agent</h1>
      <p className="text-gray-600 mb-6">
        A multi-model AI research assistant that lives in Slack.
      </p>
      
      <div className="bg-gray-100 rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-2">How to use:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Mention <code className="bg-gray-200 px-1 rounded">@ResearchBot</code> in any Slack channel</li>
          <li>Ask your research question</li>
          <li>Get synthesized insights from Claude, GPT, and Gemini</li>
          <li>Reply in the thread for follow-up questions</li>
        </ol>
      </div>

      <div className="text-sm text-gray-500">
        <p>Models: Claude Sonnet 4, GPT-4o, Gemini 2.0 Flash</p>
        <p>Follow-ups: Claude Haiku (fast)</p>
      </div>
    </main>
  )
}
