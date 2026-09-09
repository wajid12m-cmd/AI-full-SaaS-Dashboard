// Deno port of config/groq.js. groq-sdk is a plain REST wrapper (like
// OpenAI's SDK) with no native dependencies, so it works via the `npm:`
// specifier the same way jsonwebtoken and bcryptjs do.
import Groq from "npm:groq-sdk@1.3.0";

const apiKey = Deno.env.get("GROQ_API_KEY");
if (!apiKey) {
  console.warn("GROQ_API_KEY is not set — AI/agent chat calls will fail until it is.");
}

const groq = new Groq({ apiKey: apiKey || "" });

export default groq;
