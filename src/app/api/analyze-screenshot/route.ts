import { NextRequest, NextResponse } from "next/server";

/** Structured agent stats extracted from a screenshot */
interface ExtractedAgentStats {
  toolName: string;
  sessions?: number;
  completions?: number;
  linesGenerated?: number;
  hoursUsed?: number;
  timePeriod?: string;
  rawMetrics?: Record<string, string>;
}

interface AnalyzeResponse {
  success: boolean;
  data?: ExtractedAgentStats[];
  error?: string;
}

const EXTRACTION_PROMPT = `You are analyzing a screenshot of a coding agent or AI tool's usage/stats page. Extract the following information as structured JSON:

For each tool/agent visible in the screenshot, extract:
- toolName: The name of the tool (e.g., "Claude Code", "Cursor", "GitHub Copilot", "Windsurf", "Devin")
- sessions: Number of sessions/conversations (if visible)
- completions: Number of completions/generations (if visible)
- linesGenerated: Lines of code generated (if visible)
- hoursUsed: Hours or time spent (if visible, convert to hours as a number)
- timePeriod: The time period shown (e.g., "Jan 2026 - Mar 2026", "Last 30 days")
- rawMetrics: Any other key metrics shown as key-value pairs

Return a JSON array of objects. If you cannot identify any coding tool stats, return an empty array.
Only return the JSON array, no other text.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json<AnalyzeResponse>({
      success: false,
      error:
        "ANTHROPIC_API_KEY not configured. Add it to .env.local to enable screenshot analysis.",
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("screenshot") as File | null;

    if (!file) {
      return NextResponse.json<AnalyzeResponse>({
        success: false,
        error: "No screenshot file provided",
      });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json<AnalyzeResponse>({
        success: false,
        error: "File must be an image (PNG, JPG, etc.)",
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json<AnalyzeResponse>({
        success: false,
        error: "File too large. Maximum size is 10MB.",
      });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Determine media type
    const mediaType = file.type as
      | "image/png"
      | "image/jpeg"
      | "image/gif"
      | "image/webp";

    // Call Claude Haiku with vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return NextResponse.json<AnalyzeResponse>({
        success: false,
        error: "Failed to analyze screenshot. Please try again.",
      });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;

    if (!content) {
      return NextResponse.json<AnalyzeResponse>({
        success: false,
        error: "No response from analysis. Please try a clearer screenshot.",
      });
    }

    // Parse the JSON response
    try {
      // Extract JSON array from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json<AnalyzeResponse>({
          success: false,
          error:
            "Could not parse agent stats from this screenshot. Try a different screenshot or use manual entry.",
        });
      }

      const extracted: ExtractedAgentStats[] = JSON.parse(jsonMatch[0]);

      return NextResponse.json<AnalyzeResponse>({
        success: true,
        data: extracted,
      });
    } catch {
      return NextResponse.json<AnalyzeResponse>({
        success: false,
        error:
          "Could not parse agent stats from this screenshot. Try a different screenshot or use manual entry.",
      });
    }
  } catch (err) {
    console.error("Screenshot analysis error:", err);
    return NextResponse.json<AnalyzeResponse>({
      success: false,
      error: "An unexpected error occurred. Please try again.",
    });
  }
}
