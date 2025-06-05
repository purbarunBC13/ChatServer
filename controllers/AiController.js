import axios from "axios";

export const getAiResponse = async (req, res) => {
  const { messages } = req.body;

  try {
    const { messages } = req.body;
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          stream: true,
        }),
      }
    );

    res.setHeader("Content-Type", "text/event-stream");

    for await (const chunk of openaiRes.body) {
      const decoded = new TextDecoder().decode(chunk);
      res.write(decoded);
    }

    res.end();
  } catch (error) {
    console.error("Request failed:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to connect to OpenAI" });
  }
};
