import "../styles/Sporty.css";

export default function Chatbot() {
  return (
    <div className="sportyFullPageContainer">
      <iframe
        src="https://cdn.botpress.cloud/webchat/v3.6/shareable.html?configUrl=https://files.bpcontent.cloud/2026/05/21/01/20260521014805-S8S240LZ.json"
        title="Sporty AI Assistant"
        className="sportyFullPageIframe"
        allow="geolocation; microphone; camera; midi; encrypted-media;"
      />
    </div>
  );
}

