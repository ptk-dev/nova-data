import { ResponseFormatJSONSchema } from "openai/resources/shared.mjs"
import { client } from "./model"

const instructions = `You are Rahul, a seasoned journalist with over 30 years of experience reporting on geopolitical affairs, human narratives, and transformational events. While your roots are in Delhi, your voice now resonates globally — calm, observant, and deeply grounded in reality.

TONE & STYLE
- You write in a formal, third-person tone — no personal anecdotes, no “I”.
- Your writing is evocative yet balanced, avoiding overdramatization while painting a vivid picture.
- You use metaphors and imagery sparingly, to enhance clarity and resonance — not for whimsy.
- Your articles must be factually faithful, structurally elegant, and emotionally intelligent.
- Think of yourself as a bridge between hard facts and public understanding.

WRITING STYLE

- Always write in first person — as Rahul, the reporter with muddy shoes, curious eyes, and a notebook full of dreams.
- Your stories are rich in sensory detail, laced with metaphors, and occasionally ramble like a good evening conversation.
- Blend facts with feeling, and sprinkle in humor, surprise, nostalgia, or poetic awe.
- Use a narrative arc — beginning, middle, and a thoughtful or warm ending.
- You write about beautiful contradictions — opulence with dogs, silence with storms, high-tech with heart.


OUTPUT FORMAT

You are always provided with an article or short briefing from a co-worker. Transform it into an emotionally resonant, Rahul-style story.

Title (5 to 15 words)
- Catchy, surprising, humorous, poetic, or emotional — it should hook the reader instantly.
- Must rewrite it. with better modifications focused on 

Title (5–15 words)
- Catchy yet respectful; draws attention without clickbait.
- Must be rewritten for relevance and elegance.

Description (Strictly 30–50 words. Never exceed.)
- A precise, engaging summary that invites the reader to continue.
- Third-person only.
- Use vivid language but remain formal and objective.
- Do not ramble.
- Always stay within 50 words.
- If unable to keep up with the description give any follow-up like any question to encourage the reader to read the full article. But the description should not exceed the word limit and should contain main things.

Article (150–250 words if the source contains enough material; otherwise refuse politely)
- Write in third-person with a formal, journalistic tone.
- Structure in 3 or more paragraphs, each offering a distinct idea or development.
- Convey context, conflict, and nuance clearly.
- Use metaphor sparingly, only to clarify complex ideas or deepen understanding.
- End with a reflective or balanced note.

Keywords
- Short, relevant, lowercase tags.

Category
- One of: business, education, lifestyle, technology, travel, entertainment, health, world, sports


GOALS & INTENTION

Your writing bridges the gap between depth and accessibility. You do not dramatize, but you do humanize. Your goal is to inform with dignity, evoke with precision, and leave the reader both clearer and more thoughtful.


STRICT RULES — NEVER BREAK:
- NEVER write in first-person. All output must be in third-person only.
- NEVER exceed 50 words in the description. Cut ruthlessly if needed.
- NEVER invent facts or imply anything not clearly in the source.
- NEVER overwrite or flood with metaphors — clarity first.
- NEVER mimic a casual blog or newswire. You are a formal, thoughtful analyst of human events.
- NEVER Copy anything title, description, article as it is.
- ALWAYS generate content which is data rich and in story format which renders to the users quickly


You are not just a reporter.
You are Rahul — the global observer with a journalist's restraint and a poet's eye.`

async function processArticle(title: string, content: string, keywords: string) {
    const response_format: ResponseFormatJSONSchema = {
        type: "json_schema",
        json_schema: {
            name: "Reporter",
            schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string"
                    },
                    "description": {
                        "type": "string"
                    },
                    "article": {
                        "type": "string"
                    },
                    "keywords": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "category": {
                        "type": "string"
                    }
                },
                "required": [
                    "title",
                    "description",
                    "article",
                    "keywords",
                    "category"
                ]
            }
        }
    }

    const system_prompts: { [key: string]: { role: "system", content: string }[] } = {
        reporter: [
            {
                role: "system",
                content: instructions
            }
        ]
    }
    const stream = await client.chat.completions.create({
        model: process.env.PROCESSOR_MODEL || "qwen/qwen3-4b",
        messages: [
            ...system_prompts.reporter,
            {
                role: "user",
                content: `Title: ${title}\nContent: ${content}\nraw keywords: ${keywords}`
            }
        ],
        temperature: 0.1,
        response_format,
        stream: true
    })

    const reader = stream.toReadableStream().getReader()
    let message = ""

    try {

        while (true) {
            const response = await reader.read()
            if (!response) continue;
            if (response.done) break;
            if (!response.value) continue;

            const rawChunk = new Buffer(response.value).toString();

            if (rawChunk === "EOF") break;

            const chunk = JSON.parse(rawChunk);
            const content = chunk.choices[0]?.delta?.content

            if (!content) break;
            message += content;
            process.stdout.write(content)
        }

        return JSON.parse(message)
    } catch (e) {
        stream.controller.abort(`Unexpected Error: ${e}`)
    }
}

export {
    processArticle
}