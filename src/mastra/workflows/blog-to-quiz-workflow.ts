import { RuntimeContext } from "@mastra/core/di";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { quizAgent, quizSchema } from "../agents/quiz-agent";
import {
  getContentWithMetaDataTool,
  getContentWithMetaDataInputSchema,
  getContentWithMetaDataOutputSchema,
} from "../tools/get-content-with-metadata-tool";

const difficultySchema = z
  .enum(["easy", "medium", "hard"])
  .describe(
    "Difficulty level of the quiz. Can be 'easy', 'medium', or 'hard'. Defaults to 'medium'.",
  );
const quizParamsSchema = z.object({
  numberOfQuestions: z
    .number()
    .int()
    .min(5, { message: "At least 5 question required." })
    .max(20, { message: "Maximum 20 questions allowed." })
    .default(10)
    .describe(
      "Number of quiz questions to generate. Must be an integer between 5 and 20. Defaults to 10.",
    )
    .optional(),
  difficulty: difficultySchema
    .default("medium")
    .describe(
      "Difficulty level of the quiz: 'easy', 'medium', or 'hard'. Defaults to 'medium'.",
    )
    .optional(),
});
const blogToQuizInputSchema = getContentWithMetaDataInputSchema.extend(
  quizParamsSchema.shape,
);
const blogToQuizContextSchema = quizParamsSchema.extend({
  title: getContentWithMetaDataOutputSchema.shape.metaData.shape.title,
  content: getContentWithMetaDataOutputSchema.shape.content,
});

const runtimeContext = new RuntimeContext();

const fetchContentWithParamsStep = createStep({
  id: "fetch-content-with-params",
  description:
    "Fetch content with metadata and forward quiz parameters (numberOfQuestions, difficulty)",
  inputSchema: blogToQuizInputSchema,
  outputSchema: blogToQuizContextSchema,
  execute: async ({ inputData }) => {
    if (!inputData) throw new Error("No input data found.");

    const contentResult = await getContentWithMetaDataTool.execute({
      context: { path: inputData.path },
      runtimeContext,
    });
    if (!contentResult) throw new Error("No content found.");

    return {
      title: contentResult.metaData.title,
      content: contentResult.content,
      numberOfQuestions: inputData.numberOfQuestions ?? 10,
      difficulty: inputData.difficulty ?? "medium",
    };
  },
});

const generateQuizStep = createStep({
  id: "generate-quiz",
  description: "Generate a quiz from the fetched content",
  inputSchema: blogToQuizContextSchema,
  outputSchema: quizSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("No input data found.");
    }

    const { numberOfQuestions, difficulty, title, content } = inputData;
    const generateResult = await quizAgent.generateVNext(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate a ${difficulty} quiz with EXACTLY ${numberOfQuestions} question(s) from this content.
- Match the difficulty level: ${difficulty}.
- Ensure clear, unambiguous questions and plausible distractors.
- Avoid copying sentences verbatim from the source.
- Cover the main ideas evenly.
- Return only the quiz in the expected schema.

Title: ${title}
---
${content}`,
            },
          ],
        },
      ],
      {
        output: quizSchema,
      },
    );

    return quizSchema.parse(generateResult.object);
  },
});

export const blogToQuizWorkflow = createWorkflow({
  id: "blog-to-quiz",
  description:
    "Takes an article/tutorial path, retrieves the content with blog-agent and generates a quiz with quiz-agent. You can configure the number of questions and difficulty level.",
  inputSchema: blogToQuizInputSchema,
  outputSchema: quizSchema,
})
  .then(fetchContentWithParamsStep)
  .then(generateQuizStep)
  .commit();
