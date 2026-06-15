
   exports.handler = async function(event) {
  const url = new URL(event.rawUrl);

  if (event.httpMethod === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return { statusCode: 200, body: challenge };
    }

    return { statusCode: 403, body: "Forbidden" };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");

    const change = body.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const contact = change?.contacts?.[0];

    const telefono = message?.from || "";
    const nombre = contact?.profile?.name || "";
    const texto = message?.text?.body || "";
    const fecha = new Date().toISOString();

    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            "Teléfono": telefono,
            "Nombre": nombre,
            "Mensaje": texto,
            "Fecha": fecha,
            "raw_json": JSON.stringify(body)
          }
        })
      }
    );

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.log("Airtable error:", errorText);
      return { statusCode: 500, body: "AIRTABLE_ERROR" };
    }

    return { statusCode: 200, body: "EVENT_RECEIVED" };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
