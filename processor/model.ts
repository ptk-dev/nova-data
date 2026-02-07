import OpenAI from "openai"

const client = new OpenAI({
    baseURL: "http://127.0.0.1:1234/v1"
})

export {
    client
}