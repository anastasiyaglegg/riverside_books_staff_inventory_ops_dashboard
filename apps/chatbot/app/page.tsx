import ChatWidget from "@/components/ChatWidget";

export default function HomePage() {
  return (
    <main className="demo-page">
      <h1>Riverside Books & Gifts</h1>
      <p>
        This is a demo host page for Product C, the customer support chatbot. Click the
        launcher in the bottom-right corner to open it — it embeds the same way it would
        on the real storefront.
      </p>
      <ChatWidget />
    </main>
  );
}
