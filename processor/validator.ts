import OpenAI from "openai"

const client = new OpenAI({
    baseURL: "http://127.0.0.1:1234"
})

const response = await client.responses.create({
    model: "google/gemma-2-9b",
    
})