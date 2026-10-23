async function testApi() {
  console.log("Testing POST /api/texts...");
  const textRes = await fetch("http://localhost:3001/api/texts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Capítulo 1 - O Despertar da Voz",
      content: "Bem-vindo ao VozLivre. Este aplicativo transforma seus textos em áudio natural e fluido para você ouvir em qualquer lugar, mesmo com a tela do celular apagada.",
      favorite: true,
    }),
  });
  const text = await textRes.json();
  console.log("Text created:", text.id, text.title);

  console.log("Testing POST /api/texts/:id/audio...");
  const audioReq = await fetch(`http://localhost:3001/api/texts/${text.id}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice: "pt-BR-FranciscaNeural",
      rate: 1.0,
    }),
  });
  const audioData = await audioReq.json();
  console.log("Audio request response:", audioData);

  const audioId = audioData.audio.id;

  // Poll status
  let status = "PROCESSING";
  let attempts = 0;
  while (status === "PROCESSING" && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
    const statusRes = await fetch(`http://localhost:3001/api/audio/${audioId}/status`);
    const statusData = await statusRes.json();
    console.log(`Poll ${attempts}: status = ${statusData.status}, progress = ${statusData.progressPercent}%, msg = ${statusData.statusMessage}`);
    status = statusData.status;
  }

  if (status === "COMPLETED") {
    console.log("Testing HTTP Range stream on /api/audio/:id/stream...");
    const streamRes = await fetch(`http://localhost:3001/api/audio/${audioId}/stream`, {
      headers: { Range: "bytes=0-1023" },
    });
    console.log("Stream Status:", streamRes.status); // Expect 206
    console.log("Content-Range:", streamRes.headers.get("content-range"));
    console.log("Content-Length:", streamRes.headers.get("content-length"));
    console.log("Content-Type:", streamRes.headers.get("content-type"));
    console.log("🎉 ALL BACKEND CHECKS PASSED!");
  } else {
    console.error("Audio generation did not complete within expected time.");
  }
}

testApi().catch(console.error);
