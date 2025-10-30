import OpenAI from "openai";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { ObjectStorageService } from "./objectStorage";
import { randomUUID } from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const MAX_TOKENS_PER_QUERY = 2000;
const MONTHLY_QUERY_LIMIT = 1000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Database schema description for the AI
const DATABASE_SCHEMA = `
DATABASE SCHEMA:

1. students - Student/client information
   - id (uuid), organization_id (uuid), mindbody_client_id, first_name, last_name
   - email, phone, status, membership_type, join_date, created_at

2. classes - Class types offered
   - id (uuid), organization_id (uuid), mindbody_class_id, name, description
   - instructor_name, capacity, duration, created_at

3. class_schedules - Individual class sessions
   - id (uuid), organization_id (uuid), class_id (uuid, FK to classes)
   - mindbody_schedule_id, start_time, end_time, location, created_at

4. attendance - Student attendance records
   - id (uuid), organization_id (uuid), student_id (uuid, FK to students)
   - schedule_id (uuid, FK to class_schedules), attended_at, status, created_at

5. revenue - Financial transactions
   - id (uuid), organization_id (uuid), student_id (uuid, FK to students)
   - amount (decimal), type, description, transaction_date, created_at

IMPORTANT: All queries must include "WHERE organization_id = $1" for data isolation.
Use JOINs to combine tables. Aggregate functions (COUNT, SUM, AVG) are available.
Use PostgreSQL functions like EXTRACT(YEAR FROM date), TO_CHAR(), etc.
`;

// Define the SQL query execution tool
const QUERY_TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description: "Execute a custom SQL query to retrieve data from the database. You can query students, classes, class_schedules, attendance, and revenue tables. Always include WHERE organization_id = $1 for security.",
      parameters: {
        type: "object",
        properties: {
          sql_query: {
            type: "string",
            description: "The SQL SELECT query to execute. Must be a read-only SELECT statement. Use $1 for organization_id parameter. Example: SELECT COUNT(*) FROM class_schedules WHERE organization_id = $1 AND EXTRACT(YEAR FROM start_time) = 2025"
          },
          explanation: {
            type: "string",
            description: "Brief explanation of what this query does (for logging/debugging)"
          }
        },
        required: ["sql_query", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_excel_spreadsheet",
      description: "Create an Excel spreadsheet file (.xlsx) from structured data. Use this when the user asks to export data, create a spreadsheet, or download results as Excel. The data should be formatted as an array of objects where each object represents a row.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "The filename for the Excel file (without extension). Example: 'student_roster' or 'revenue_report_2025'"
          },
          sheet_name: {
            type: "string",
            description: "The name of the worksheet/sheet. Example: 'Students' or 'Revenue Data'"
          },
          data: {
            type: "array",
            description: "Array of objects where each object represents a row. All objects should have the same keys which become column headers. Example: [{name: 'Alice', age: 25}, {name: 'Bob', age: 30}]",
            items: {
              type: "object"
            }
          },
          description: {
            type: "string",
            description: "Brief description of what this spreadsheet contains (for the user)"
          }
        },
        required: ["filename", "sheet_name", "data", "description"]
      }
    }
  }
];

export class OpenAIService {
  // Execute database query functions called by AI
  private async executeFunctionCall(
    functionName: string,
    args: any,
    organizationId: string,
    userId: string
  ): Promise<string> {
    try {
      if (functionName === "execute_sql_query") {
        const { sql_query, explanation } = args;
        
        // Security: Validate that it's a SELECT query only
        const trimmedQuery = sql_query.trim().toUpperCase();
        if (!trimmedQuery.startsWith("SELECT")) {
          return JSON.stringify({ 
            error: "Only SELECT queries are allowed for security reasons" 
          });
        }
        
        // Security: Check for dangerous SQL keywords
        const dangerousKeywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE"];
        for (const keyword of dangerousKeywords) {
          if (trimmedQuery.includes(keyword)) {
            return JSON.stringify({ 
              error: `Query contains forbidden keyword: ${keyword}` 
            });
          }
        }
        
        // Security: Ensure organization_id filter is present
        if (!sql_query.includes("$1") && !sql_query.toLowerCase().includes("organization_id")) {
          return JSON.stringify({ 
            error: "Query must include organization_id filter using $1 parameter" 
          });
        }
        
        console.log(`[AI Query] Executing: ${explanation}`);
        console.log(`[AI Query] SQL: ${sql_query}`);
        
        // Execute the query with organization_id as parameter
        // Replace $1 with the actual organization ID (properly escaped)
        const finalQuery = sql_query.replace(/\$1/g, `'${organizationId.replace(/'/g, "''")}'`);
        const result = await db.execute(sql.raw(finalQuery));
        
        console.log(`[AI Query] Result rows: ${result.rows.length}`);
        
        return JSON.stringify({
          success: true,
          explanation,
          row_count: result.rows.length,
          data: result.rows.slice(0, 100) // Limit to 100 rows for response size
        });
      }
      
      if (functionName === "create_excel_spreadsheet") {
        const { filename, sheet_name, data, description } = args;
        
        console.log(`[AI Excel] Creating spreadsheet: ${filename}`);
        console.log(`[AI Excel] Data type:`, typeof data);
        console.log(`[AI Excel] Data:`, JSON.stringify(data).substring(0, 200));
        
        // Validate data
        if (!data || !Array.isArray(data)) {
          return JSON.stringify({
            error: "Data must be a non-empty array",
            received_type: typeof data,
          });
        }
        
        if (data.length === 0) {
          return JSON.stringify({
            error: "Data array cannot be empty",
          });
        }
        
        console.log(`[AI Excel] Rows: ${data.length}`);
        
        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet_name);
        
        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Save to object storage
        const objectStorage = new ObjectStorageService();
        const privateDir = objectStorage.getPrivateObjectDir();
        const fileId = randomUUID();
        const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fullFilename = `${fileId}-${safeFilename}.xlsx`;
        const storagePath = `${privateDir}/excel/${fullFilename}`;
        
        await objectStorage.saveFile(storagePath, excelBuffer);
        
        // Save file metadata to database for ownership tracking
        await storage.createAiGeneratedFile({
          organizationId,
          userId,
          filename: fullFilename,
          originalFilename: `${safeFilename}.xlsx`,
          storagePath,
          fileType: 'excel',
        });
        
        // Generate download URL
        const downloadUrl = `/api/files/download/${fullFilename}`;
        
        console.log(`[AI Excel] Saved to: ${storagePath}`);
        console.log(`[AI Excel] Download URL: ${downloadUrl}`);
        console.log(`[AI Excel] Metadata saved for org ${organizationId}, user ${userId}`);
        
        return JSON.stringify({
          success: true,
          description,
          filename: `${safeFilename}.xlsx`,
          download_url: downloadUrl,
          row_count: data.length,
          message: `Excel file "${safeFilename}.xlsx" created successfully with ${data.length} rows.`
        });
      }
      
      return JSON.stringify({ 
        error: `Unknown function: ${functionName}` 
      });
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      return JSON.stringify({ 
        error: `Failed to execute ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  async generateInsight(
    organizationId: string,
    userId: string,
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    fileContext: string = ""
  ): Promise<{ response: string; tokensUsed: number }> {
    const recentQueries = await storage.getAIQueries(organizationId, 100);
    const thisMonthQueries = recentQueries.filter((q) => {
      const queryDate = new Date(q.createdAt);
      const now = new Date();
      return (
        queryDate.getMonth() === now.getMonth() && queryDate.getFullYear() === now.getFullYear()
      );
    });

    if (thisMonthQueries.length >= MONTHLY_QUERY_LIMIT) {
      throw new Error(
        `Monthly query limit of ${MONTHLY_QUERY_LIMIT} reached. Please upgrade your plan.`
      );
    }

    // Use tool calling to let AI query the database
    const messages: any[] = [
      {
        role: "system",
        content: `You are an AI assistant for analyzing Mindbody studio data. You have access to a SQL database query tool.

${DATABASE_SCHEMA}

INSTRUCTIONS:
- For ANY question about the data, use the execute_sql_query tool to write and run a SQL SELECT query
- Always include "WHERE organization_id = $1" in your queries for data isolation
- Be creative with SQL - you can use JOINs, aggregations, subqueries, date functions, etc.
- After getting results, analyze them and provide clear, actionable insights
- When users ask follow-up questions, refer to conversation history for context
- When users ask to create a spreadsheet, export to Excel, or download data, use the create_excel_spreadsheet tool
- You can combine both tools: first query data with execute_sql_query, then create a spreadsheet with the results
${fileContext ? `- The user has uploaded files. Use their content to answer questions or cross-reference with database data` : ''}

EXAMPLES:
- "How many classes in 2025?" → SELECT COUNT(*) FROM class_schedules WHERE organization_id = $1 AND EXTRACT(YEAR FROM start_time) = 2025
- "Top 10 students by attendance?" → SELECT s.first_name, s.last_name, COUNT(*) as classes FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.organization_id = $1 AND a.status = 'attended' GROUP BY s.id, s.first_name, s.last_name ORDER BY classes DESC LIMIT 10
- "Revenue this month?" → SELECT SUM(amount) FROM revenue WHERE organization_id = $1 AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
- "How many intro offers sold?" → SELECT COUNT(*) FROM revenue WHERE organization_id = $1 AND description ILIKE '%intro%'
- "Intro offers in last 60 days?" → SELECT COUNT(*) FROM revenue WHERE organization_id = $1 AND description ILIKE '%intro%' AND transaction_date >= CURRENT_DATE - INTERVAL '60 days'

NOTES:
- Use ILIKE for case-insensitive text matching (e.g., finding "intro" in descriptions)
- The description field contains product/service names
- Intro offers specifically include these products:
  * "Intro Offer - 30 Days - (EYES ONLY) New Student" ($75)
  * "Intro Offer - 30 Days - For New Students" ($75)
  * "Intro Offer - Upgrade from $20 Drop In Class" ($55)
  * "Intro Offer - Upgrade from single class $42" ($42)
  * And any description containing "Intro" (case-insensitive)
- Use INTERVAL for date calculations (e.g., CURRENT_DATE - INTERVAL '60 days' for last 60 days)

You can answer ANY question about the data - just write the appropriate SQL query!${fileContext ? `\n\nUPLOADED FILE DATA:\n${fileContext}` : ''}`
      }
    ];

    // Add conversation history (previous messages)
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add the new user query
    messages.push({
      role: "user",
      content: query
    });

    let totalTokensUsed = 0;
    let finalResponse = "";
    let iterationCount = 0;
    const maxIterations = 5; // Allow multiple tool calls if needed
    const downloadLinks: Array<{ filename: string; url: string }> = [];

    while (iterationCount < maxIterations) {
      let completion;
      let retryCount = 0;
      
      // Retry loop with exponential backoff for rate limits
      while (retryCount <= MAX_RETRIES) {
        try {
          completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            tools: QUERY_TOOLS as any,
            tool_choice: "auto",
            max_tokens: MAX_TOKENS_PER_QUERY,
            temperature: 0.7,
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          // Check if it's a rate limit error (429)
          if (error?.status === 429 && retryCount < MAX_RETRIES) {
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
            console.log(`[OpenAI] Rate limit hit, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await sleep(retryDelay);
            retryCount++;
          } else {
            // Not a rate limit error or max retries exceeded
            if (error?.status === 429) {
              throw new Error("OpenAI API is currently experiencing high demand. Please try again in a few moments.");
            }
            throw error; // Re-throw other errors
          }
        }
      }

      if (!completion) {
        throw new Error("Failed to get response from OpenAI after retries");
      }

      totalTokensUsed += completion.usage?.total_tokens || 0;
      const message = completion.choices[0]?.message;

      if (!message) {
        throw new Error("No response from AI");
      }

      messages.push(message);

      // Check if AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          const result = await this.executeFunctionCall(
            functionName,
            functionArgs,
            organizationId,
            userId
          );

          // Extract download links from Excel creation responses
          if (functionName === 'create_excel_spreadsheet') {
            try {
              const resultData = JSON.parse(result);
              if (resultData.success && resultData.download_url) {
                downloadLinks.push({
                  filename: resultData.filename,
                  url: resultData.download_url,
                });
              }
            } catch (e) {
              console.error('Failed to parse Excel creation result:', e);
            }
          }

          // Add tool response to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        iterationCount++;
        continue;
      }

      // No more tool calls, we have final response
      finalResponse = message.content || "No response generated";
      break;
    }

    // Append download links to the response
    if (downloadLinks.length > 0) {
      finalResponse += "\n\n";
      downloadLinks.forEach(link => {
        finalResponse += `[Download: ${link.filename}](${link.url})\n`;
      });
    }

    // Save query to database
    await storage.createAIQuery({
      organizationId,
      userId,
      query,
      response: finalResponse,
      tokensUsed: totalTokensUsed,
    });

    return {
      response: finalResponse,
      tokensUsed: totalTokensUsed,
    };
  }
}

export const openaiService = new OpenAIService();
