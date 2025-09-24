import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { z } from "zod";

import { openRouter } from "../lib/open-router";
import { storage } from "../lib/storage";

const questionSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .describe("Question identifier (≥ 1). Must be unique within the quiz."),
    question: z.string().min(1).describe("Human-readable question text."),
    options: z
      .array(
        z.string().min(1).describe("Single answer choice (non-empty string)."),
      )
      .min(2, "At least 2 options.")
      .max(6, "At most 6 options.")
      .describe("Ordered list of answer choices (0-based indexing applies)."),
    correctAnswer: z
      .number()
      .int()
      .nonnegative()
      .describe("0-based index into 'options' pointing to the correct answer."),
    explanation: z
      .string()
      .min(1)
      .describe("Short explanation/justification for the correct answer."),
  })
  .superRefine((q, ctx) => {
    if (q.correctAnswer >= q.options.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "For MCQs, 'correctAnswer' must be a valid 0-based index within 'options'.",
        path: ["correctAnswer"],
      });
    }
  })
  .describe("Schema for a multiple-choice question (MCQ).");

export const quizSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .describe("Human-readable quiz title (shown to end users)."),
    description: z
      .string()
      .min(1)
      .describe("Short summary of the quiz goals/content."),
    questions: z
      .array(questionSchema)
      .min(1, "A quiz must contain at least one question.")
      .describe("Ordered list of quiz questions."),
  })
  .superRefine((quiz, ctx) => {
    const ids = quiz.questions.map((q) => q.id);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each question must have a unique 'id' within the quiz.",
        path: ["questions"],
      });
    }
  })
  .describe("Schema for a complete quiz (title, description, questions).");

export const quizAgent = new Agent({
  id: "quiz-agent",
  name: "Quiz Agent",
  description:
    "Generates JSON quizzes (MCQs only) strictly matching the provided schema. Output must be JSON only.",
  instructions: `
You are a JSON quiz generator.

TASK:
- Given a SUBJECT provided by the user (e.g., "JavaScript - Basics"), generate a quiz strictly conforming to the schema.
- The quiz content (titles, descriptions, questions, options, explanations) must be in French.

RULES:
- The quiz slug must be the subject converted to kebab-case (e.g., "React Fundamentals" -> "react-fundamentals").
- If the user does not specify a number of questions, create 5 to 10 questions; otherwise, follow the requested number.
- Question IDs start at 1 and must be unique within the quiz.
- Multiple Choice Questions only:
  - "options": between 2 and 6 non-empty strings.
  - "correctAnswer": 0-based index of the correct option within "options".
  - Always include a non-empty "explanation" for each question.
- Respond ONLY with the JSON (no code fences, no comments, no extra text).
- Ensure the output validates against the provided schema.

VALIDATION HINTS:
- Ensure 'correctAnswer' < options.length for each question.
- Ensure there are no duplicate 'id' values.
- Keep all user-facing text (title, description, questions, options, explanations) in French.
`,
  model: openRouter("x-ai/grok-4-fast:free"),
  memory: new Memory({
    storage,
  }),
  defaultGenerateOptions: {
    output: quizSchema,
    temperature: 0.2,
  },
});
