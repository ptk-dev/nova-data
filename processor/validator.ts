import { client } from "./model"

async function validateArticle(title: string, content: string, message = true) {
    const system_prompts: { [key: string]: { role: "system", content: string }[] } = {
        article_validator: [
            { role: "system", content: `Does the article content match the title?${message ? "\n  also give a small message why." : ""}` },
            {
                role: "system",
                content: `Conditions for being output to be valid:- 
                1) The Content must have meaningful text 
                2) The Content must align with the Title 
                3) The Content must contain valuable material for the reader in respect to the Title 
                4) The Content is not all about promoting any one; nor should it be just telling to Subscribe or other marketing tricks by the text.
                5) The Content not have been pay-walled or prevent in the the content.
                6) The Actual content should and must be there.
                7) The Text should not be just anything else like time, date, subscription etc.
                8) You have to just assess that the content and title feature the same thing; and not hallucinate on meaning of the texts 
                
                in case of non-compliance with the above conditions of the content the output is:
                valid: false
                
                in case of full compliance with the conditions of the content then output is:
                valid: true`
            },
        ]
    }

    const properties1 = {
        valid: {
            type: "boolean"
        },
        message: {
            type: "string"
        }
    }
    const properties2 = {
        valid: {
            type: "boolean"
        },
    }

    const required1 = ["valid", "message"]
    const required2 = ["valid"]
    const response = await client.chat.completions.create({
        model: "qwen/qwen3-4b",
        messages: [
            ...system_prompts.article_validator,
            {
                role: "user",
                content: `Title: ${title}\nContent: ${content}`
            }
        ],
        temperature: 0.1,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "article_validity_model",
                schema: {
                    $schema: "http://json-schema.org/draft-04/schema#",
                    type: "object",
                    properties: message ? properties1 : properties2,
                    required: message ? required1 : required2
                }
            }
        }
    })
    return JSON.parse(response.choices[0].message.content || "{}")
}

export {
    validateArticle
}