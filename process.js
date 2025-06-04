import { LMStudioClient } from "@lmstudio/sdk";
import {z} from "zod"


const client = new LMStudioClient();

const model = await client.llm.model("google/gemma-3-1b");

const schema = z.object({
    title: z.string(),
    description: z.string(),
    article: z.string(),
    keywords: z.array(z.string()), 
})


const article = 
`
At 3 am on May 24, the police arrived at 42-year-old Manikjan Begum’s home in Assam’s Darrang district.

They took her along, and asked her family to report to the Dhula police station during the day. About 12 hours later, she was let go, after the police verified her documents.

The next day, Begum, who was declared a foreigner by a foreigners’ tribunal in 2018, was summoned to the police station again, her son said. Foreigner tribunals are quasi-judicial bodies unique to Assam, which rule on citizenship cases.

On her second visit to the police station, Begum’s husband accompanied her, along with her eight-month-old daughter.

“From the Dhula police station, she was taken to the police reserve in Mangaldai. She was made to sit there till 1 pm and again taken to the office of the superintendent of police,” said Barek Ali, the 22-year-old eldest son.

Ali claims that the family members last saw her, with her baby, on the afternoon of May 25 at the office of the superintendent of border police. “We waited at the SP’s office till 8 pm, but she did not come out,” he said.

For the next two days, Begum’s family members kept visiting the Dhula police station and Darrang SP’s office. “We kept going back to the police for two days, but they said they did not know where she or her child was,” Ali said.

Darrang superintendent of police Prakash Sonowal told Scroll that he is unaware of Begum’s whereabouts. “The family members will know. Talk to them,” he said, before hanging up.

Begum’s family is not alone. Days after the Assam police’s crackdown on alleged undocumented migrants, several residents from Dhubri, Chirang, Barpeta, Darrang, Morigaon, Kokrajhar, among other districts, have alleged that their family members – declared foreigners by the state’s foreigners’ tribunals – had gone “missing”, after being arrested or detained by the police.

Many fear that their family members have been forced out of Indian territory as part of what the Assam chief minister has described as “push-back” operations. On Tuesday, Scroll had reported that a former teacher from Morigaon district, Khairul Islam, whose citizenship case was still being heard in the Supreme Court, had been picked up from the Matia detention centre and forced out along the Bangladesh border near Assam’s South Salmara district in the early hours of May 27.

On Thursday, the nephew of two men from Kamrup district moved Gauhati High Court, seeking information about his uncles. The two men, Abu Bakkar Siddique and Akbar Ali, were summoned to the Nagarbera police station on May 25. “Since then, the authorities have refused to give details of their whereabouts,” Aman Wadud, one of the advocates representing them in the court, told Scroll.
The petitioner, Torap Ali, said he was “apprehensive that his uncles will be pushed back into Bangladesh, in light of recent reports”. The court has issued a notice to the state government, seeking its response.

Spotted in Bangladesh
On Wednesday, the worst fears of Begum’s family members were confirmed. Her son, Ali, was alerted about a news report from Bangladesh’s Lalmonirhat, a video of which was posted on Facebook.

Citing local residents, the report by DBC News alleged that 13 people – including six women and a baby – had been “pushed into” Bangladesh territory by India’s Border Security Force on the morning of May 28.

The story was filmed at the no man’s land between India and Bangladesh – near the Chawratari border in Bangladesh’s Lalmonirhat, which shares a border with West Bengal.

Ali claimed that he saw his mother standing in a field, with her eight-month-old infant, in the video. “My mother has been taken away across the border. Are they human or animals? ” he said in disbelief.
`
const prompt = `"""${article}""" summarize this in 30 words (description) with a title not more that 5-10 words (title). in json. and a detailed version of about 120-180 (and in three descriptive paragraphs must.!!!) words summary (article) format of reply. with relevant keywords -> {title, aritcle, keywords, description}`;

const result = await model.respond(prompt, {
    structured: schema,
    preset: "Reporter",
    
    // maxTokens: 200,
});

console.info(JSON.parse(result.content));


process.exit(0)
