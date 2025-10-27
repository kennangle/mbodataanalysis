import OpenAI from "openai";
import { storage } from "./storage";
import { db } from "./db";
import { students, attendance, revenue, classes } from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const MAX_TOKENS_PER_QUERY = 2000;
const MONTHLY_QUERY_LIMIT = 1000;

// Define tools the AI can call to query the database (using new tools format)
const QUERY_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_student_attendance",
      description: "Get attendance records for a specific student by name. Returns total classes attended and attendance history.",
      parameters: {
        type: "object",
        properties: {
          student_name: {
            type: "string",
            description: "The full or partial name of the student (e.g., 'Ameet Srivastava' or 'Ameet')"
          },
          date_range: {
            type: "string",
            enum: ["all_time", "past_year", "past_month"],
            description: "Time range for attendance records"
          }
        },
        required: ["student_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_students_by_attendance",
      description: "Get the top N students ranked by number of classes attended",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of top students to return (default 10)"
          },
          date_range: {
            type: "string",
            enum: ["all_time", "past_year", "past_month"],
            description: "Time range for counting attendance"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_revenue_by_period",
      description: "Get revenue statistics for a specific time period with breakdown",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_month", "last_month", "this_quarter", "last_quarter", "this_year", "last_year"],
            description: "The time period to analyze"
          },
          breakdown_by: {
            type: "string",
            enum: ["day", "month", "type"],
            description: "How to break down the revenue data"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_class_statistics",
      description: "Get statistics about classes including attendance rates, popular times, and performance",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["most_popular", "attendance_rate", "by_time_of_day", "underperforming"],
            description: "What class metric to analyze"
          }
        },
        required: ["metric"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_student_revenue",
      description: "Get revenue/purchase information for a specific student or all students",
      parameters: {
        type: "object",
        properties: {
          student_name: {
            type: "string",
            description: "The student's name (optional - if omitted, returns top spenders)"
          },
          limit: {
            type: "number",
            description: "If getting top spenders, how many to return"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_student_statistics",
      description: "Get statistics about students including total count, active members, new students in a time period, status breakdown",
      parameters: {
        type: "object",
        properties: {
          include_breakdown: {
            type: "boolean",
            description: "Whether to include detailed breakdown by status (default true)"
          },
          time_period: {
            type: "string",
            enum: ["all_time", "past_year", "past_month"],
            description: "Time period for counting new students (default all_time)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_custom_query",
      description: "Execute a custom aggregation or complex query on the database. Use when other functions don't fit the question.",
      parameters: {
        type: "object",
        properties: {
          query_type: {
            type: "string",
            description: "Description of what data to retrieve (e.g., 'inactive students', 'revenue per class type', 'attendance trends')"
          }
        },
        required: ["query_type"]
      }
    }
  }
];

export class OpenAIService {
  // Execute database query functions called by AI
  private async executeFunctionCall(
    functionName: string,
    args: any,
    organizationId: string
  ): Promise<string> {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    try {
      switch (functionName) {
        case "get_student_attendance": {
          const { student_name, date_range = "all_time" } = args;
          
          // Search for student by name (case-insensitive partial match)
          const allStudents = await db
            .select()
            .from(students)
            .where(eq(students.organizationId, organizationId));
          
          const nameLower = student_name.toLowerCase();
          const matchingStudents = allStudents.filter(s => 
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(nameLower)
          );
          
          if (matchingStudents.length === 0) {
            return JSON.stringify({ error: `No student found matching "${student_name}"` });
          }
          
          const student = matchingStudents[0];
          
          // Get attendance records with date filtering
          let attendanceRecords = await db
            .select()
            .from(attendance)
            .where(
              and(
                eq(attendance.organizationId, organizationId),
                eq(attendance.studentId, student.id),
                eq(attendance.status, "attended")
              )
            )
            .orderBy(desc(attendance.attendedAt));
          
          // Filter by date range
          if (date_range === "past_year") {
            attendanceRecords = attendanceRecords.filter(a => new Date(a.attendedAt) >= oneYearAgo);
          } else if (date_range === "past_month") {
            attendanceRecords = attendanceRecords.filter(a => new Date(a.attendedAt) >= oneMonthAgo);
          }
          
          return JSON.stringify({
            student: `${student.firstName} ${student.lastName}`,
            total_classes: attendanceRecords.length,
            date_range,
            most_recent: attendanceRecords[0]?.attendedAt || null
          });
        }
        
        case "get_top_students_by_attendance": {
          const { limit = 10, date_range = "all_time" } = args;
          
          // Get all students and their attendance counts
          const result = await db
            .select({
              studentId: attendance.studentId,
              firstName: students.firstName,
              lastName: students.lastName,
              count: sql<number>`count(*)::int`
            })
            .from(attendance)
            .innerJoin(students, eq(attendance.studentId, students.id))
            .where(
              and(
                eq(attendance.organizationId, organizationId),
                eq(attendance.status, "attended"),
                date_range === "past_year" ? gte(attendance.attendedAt, oneYearAgo) :
                date_range === "past_month" ? gte(attendance.attendedAt, oneMonthAgo) :
                sql`true`
              )
            )
            .groupBy(attendance.studentId, students.firstName, students.lastName)
            .orderBy(desc(sql`count(*)`))
            .limit(limit);
          
          return JSON.stringify({
            date_range,
            top_students: result.map((r, i) => ({
              rank: i + 1,
              name: `${r.firstName} ${r.lastName}`,
              classes_attended: r.count
            }))
          });
        }
        
        case "get_revenue_by_period": {
          const { period, breakdown_by } = args;
          
          // Calculate date range based on period
          let startDate: Date, endDate: Date = now;
          
          if (period === "this_month") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          } else if (period === "last_month") {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          } else if (period === "this_year") {
            startDate = new Date(now.getFullYear(), 0, 1);
          } else if (period === "last_year") {
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31);
          } else {
            startDate = oneMonthAgo;
          }
          
          const revenueData = await db
            .select({
              total: sql<number>`sum(cast(${revenue.amount} as numeric))`,
              count: sql<number>`count(*)::int`,
              type: breakdown_by === "type" ? revenue.type : sql`'all'`
            })
            .from(revenue)
            .where(
              and(
                eq(revenue.organizationId, organizationId),
                gte(revenue.transactionDate, startDate),
                lte(revenue.transactionDate, endDate)
              )
            )
            .groupBy(breakdown_by === "type" ? revenue.type : sql`'all'`);
          
          return JSON.stringify({
            period,
            total_revenue: revenueData.reduce((sum, r) => sum + Number(r.total || 0), 0),
            transaction_count: revenueData.reduce((sum, r) => sum + r.count, 0),
            breakdown: breakdown_by === "type" ? revenueData.map(r => ({
              type: r.type,
              revenue: Number(r.total || 0),
              count: r.count
            })) : null
          });
        }
        
        case "get_student_statistics": {
          const { include_breakdown = true, time_period = "all_time" } = args;
          
          // Get total student count
          const totalStudents = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(students)
            .where(eq(students.organizationId, organizationId));
          
          // Get active students (status = 'active')
          const activeStudents = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(students)
            .where(
              and(
                eq(students.organizationId, organizationId),
                eq(students.status, "active")
              )
            );
          
          // Get students with memberships (membershipType is not null and not empty)
          const studentsWithMemberships = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(students)
            .where(
              and(
                eq(students.organizationId, organizationId),
                sql`${students.membershipType} IS NOT NULL AND ${students.membershipType} != ''`
              )
            );
          
          let newStudents = 0;
          if (time_period !== "all_time") {
            const cutoffDate = time_period === "past_year" ? oneYearAgo : oneMonthAgo;
            const newStudentResult = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(students)
              .where(
                and(
                  eq(students.organizationId, organizationId),
                  gte(students.joinDate, cutoffDate)
                )
              );
            newStudents = newStudentResult[0]?.count || 0;
          }
          
          const result: any = {
            total_students: totalStudents[0]?.count || 0,
            active_students: activeStudents[0]?.count || 0,
            students_with_memberships: studentsWithMemberships[0]?.count || 0,
            time_period
          };
          
          if (time_period !== "all_time") {
            result.new_students = newStudents;
          }
          
          // Get status breakdown if requested
          if (include_breakdown) {
            const statusBreakdown = await db
              .select({
                status: students.status,
                count: sql<number>`count(*)::int`
              })
              .from(students)
              .where(eq(students.organizationId, organizationId))
              .groupBy(students.status);
            
            result.status_breakdown = statusBreakdown.map(s => ({
              status: s.status,
              count: s.count
            }));
          }
          
          return JSON.stringify(result);
        }
        
        case "execute_custom_query": {
          const { query_type } = args;
          const queryLower = query_type.toLowerCase();
          
          // Inactive students query
          if (queryLower.includes("inactive") && queryLower.includes("student")) {
            const inactiveStudents = await db
              .select({
                firstName: students.firstName,
                lastName: students.lastName,
                email: students.email,
                status: students.status,
                lastAttended: sql<Date>`MAX(${attendance.attendedAt})`
              })
              .from(students)
              .leftJoin(attendance, eq(students.id, attendance.studentId))
              .where(eq(students.organizationId, organizationId))
              .groupBy(students.id, students.firstName, students.lastName, students.email, students.status)
              .having(
                sql`MAX(${attendance.attendedAt}) < ${oneMonthAgo} OR MAX(${attendance.attendedAt}) IS NULL`
              )
              .limit(50);
            
            return JSON.stringify({
              query_type: "inactive_students",
              count: inactiveStudents.length,
              students: inactiveStudents.map(s => ({
                name: `${s.firstName} ${s.lastName}`,
                email: s.email,
                status: s.status,
                last_attended: s.lastAttended
              }))
            });
          }
          
          // Revenue per class type
          if (queryLower.includes("revenue") && queryLower.includes("class")) {
            const revenueByClass = await db
              .select({
                className: classes.name,
                totalRevenue: sql<number>`sum(cast(${revenue.amount} as numeric))`,
                transactionCount: sql<number>`count(*)::int`
              })
              .from(revenue)
              .leftJoin(classes, sql`${revenue.description} ILIKE '%' || ${classes.name} || '%'`)
              .where(eq(revenue.organizationId, organizationId))
              .groupBy(classes.name)
              .orderBy(desc(sql`sum(cast(${revenue.amount} as numeric))`))
              .limit(20);
            
            return JSON.stringify({
              query_type: "revenue_per_class",
              results: revenueByClass.map(r => ({
                class: r.className || "Other",
                revenue: Number(r.totalRevenue || 0),
                transactions: r.transactionCount
              }))
            });
          }
          
          // Attendance trends
          if (queryLower.includes("attendance") && queryLower.includes("trend")) {
            const monthlyAttendance = await db
              .select({
                month: sql<string>`TO_CHAR(${attendance.attendedAt}, 'YYYY-MM')`,
                count: sql<number>`count(*)::int`
              })
              .from(attendance)
              .where(
                and(
                  eq(attendance.organizationId, organizationId),
                  eq(attendance.status, "attended"),
                  gte(attendance.attendedAt, oneYearAgo)
                )
              )
              .groupBy(sql`TO_CHAR(${attendance.attendedAt}, 'YYYY-MM')`)
              .orderBy(sql`TO_CHAR(${attendance.attendedAt}, 'YYYY-MM')`);
            
            return JSON.stringify({
              query_type: "attendance_trends",
              time_period: "past_year",
              monthly_data: monthlyAttendance.map(m => ({
                month: m.month,
                attendance_count: m.count
              }))
            });
          }
          
          // Student retention (students who attended multiple months)
          if (queryLower.includes("retention") || queryLower.includes("regular")) {
            const retentionData = await db
              .select({
                studentId: attendance.studentId,
                firstName: students.firstName,
                lastName: students.lastName,
                monthsActive: sql<number>`COUNT(DISTINCT TO_CHAR(${attendance.attendedAt}, 'YYYY-MM'))::int`,
                totalClasses: sql<number>`count(*)::int`
              })
              .from(attendance)
              .innerJoin(students, eq(attendance.studentId, students.id))
              .where(
                and(
                  eq(attendance.organizationId, organizationId),
                  eq(attendance.status, "attended"),
                  gte(attendance.attendedAt, new Date(now.getFullYear(), now.getMonth() - 6, 1))
                )
              )
              .groupBy(attendance.studentId, students.firstName, students.lastName)
              .having(sql`COUNT(DISTINCT TO_CHAR(${attendance.attendedAt}, 'YYYY-MM')) >= 3`)
              .orderBy(desc(sql`count(*)`))
              .limit(30);
            
            return JSON.stringify({
              query_type: "student_retention",
              time_period: "past_6_months",
              retained_students: retentionData.map(s => ({
                name: `${s.firstName} ${s.lastName}`,
                months_active: s.monthsActive,
                total_classes: s.totalClasses
              }))
            });
          }
          
          // Generic fallback - provide summary stats
          return JSON.stringify({
            query_type,
            message: "Query type not specifically implemented. Try being more specific or use one of the other query functions.",
            suggestions: [
              "Ask about 'inactive students'",
              "Ask about 'revenue per class type'",
              "Ask about 'attendance trends'",
              "Ask about 'student retention' or 'regular students'"
            ]
          });
        }
        
        default:
          return JSON.stringify({ error: `Function ${functionName} not implemented yet. Please ask a different question or try rephrasing.` });
      }
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      return JSON.stringify({ error: `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  }

  async generateInsight(
    organizationId: string,
    userId: string,
    query: string
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
        content: `You are an AI assistant for analyzing Mindbody studio data (students, classes, attendance, revenue). 
You have access to database query tools. Call the appropriate tools to get real data, then provide insights based on the results.
Be specific, data-driven, and actionable in your responses.`
      },
      {
        role: "user",
        content: query
      }
    ];

    let totalTokensUsed = 0;
    let finalResponse = "";
    let iterationCount = 0;
    const maxIterations = 5; // Allow multiple tool calls if needed

    while (iterationCount < maxIterations) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: QUERY_TOOLS as any,
        tool_choice: "auto",
        max_tokens: MAX_TOKENS_PER_QUERY,
        temperature: 0.7,
      });

      totalTokensUsed += completion.usage?.total_tokens || 0;
      const message = completion.choices[0]?.message;

      if (!message) {
        throw new Error("No response from AI");
      }

      messages.push(message);

      // Check if AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Process all tool calls
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

            console.log(`[AI Query] Calling tool: ${functionName}`, functionArgs);

            // Execute the function and get results
            const functionResult = await this.executeFunctionCall(functionName, functionArgs, organizationId);

            console.log(`[AI Query] Tool result:`, functionResult);

            // Add tool result to conversation
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: functionResult
            });
          }
        }

        iterationCount++;
      } else {
        // AI has final answer
        finalResponse = message.content || "No response generated";
        break;
      }
    }

    if (!finalResponse) {
      finalResponse = "Unable to complete the query. Please try rephrasing your question.";
    }

    await storage.createAIQuery({
      organizationId,
      userId,
      query,
      response: finalResponse,
      tokensUsed: totalTokensUsed,
    });

    return { response: finalResponse, tokensUsed: totalTokensUsed };
  }

  async getUsageStats(organizationId: string): Promise<{
    queriesThisMonth: number;
    tokensThisMonth: number;
    queryLimit: number;
  }> {
    const queries = await storage.getAIQueries(organizationId, 1000);

    const now = new Date();
    const thisMonthQueries = queries.filter((q) => {
      const queryDate = new Date(q.createdAt);
      return (
        queryDate.getMonth() === now.getMonth() && queryDate.getFullYear() === now.getFullYear()
      );
    });

    const tokensThisMonth = thisMonthQueries.reduce((sum, q) => sum + (q.tokensUsed || 0), 0);

    return {
      queriesThisMonth: thisMonthQueries.length,
      tokensThisMonth,
      queryLimit: MONTHLY_QUERY_LIMIT,
    };
  }
}

export const openaiService = new OpenAIService();
