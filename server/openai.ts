import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const MAX_TOKENS_PER_QUERY = 2000;
const MONTHLY_QUERY_LIMIT = 1000;

export class OpenAIService {
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

    // Fetch all students with their attendance data
    const [students, totalStudentCount, activeStudentCount, classes, allAttendance, revenue] = await Promise.all(
      [
        storage.getStudents(organizationId),
        storage.getStudentCount(organizationId),
        storage.getActiveStudentCount(organizationId),
        storage.getClasses(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId),
      ]
    );

    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const revenueStats = await storage.getRevenueStats(organizationId, lastMonth, now);

    const inactiveStudentCount = totalStudentCount - activeStudentCount;

    // Build student attendance summary (limit to top 100 most active to save tokens)
    const studentAttendanceCounts = new Map<string, { name: string; count: number; studentId: string }>();
    
    allAttendance.forEach(record => {
      const student = students.find(s => s.id === record.studentId);
      if (student && record.status === "attended") {
        const key = student.id;
        const fullName = `${student.firstName} ${student.lastName}`;
        const existing = studentAttendanceCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          studentAttendanceCounts.set(key, {
            name: fullName,
            count: 1,
            studentId: student.id
          });
        }
      }
    });

    // Sort by attendance count and take top 100
    const topStudents = Array.from(studentAttendanceCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    // Filter attendance for past year
    const pastYearAttendance = allAttendance.filter(a => new Date(a.attendedAt) >= oneYearAgo);

    const dataContext = `
You are an AI assistant helping analyze fitness and wellness business data for a Mindbody studio.

IMPORTANT: You have access to detailed student attendance data. When asked about specific students, search the student list below.

STUDENTS WITH ATTENDANCE (Top 100 most active):
${topStudents.map(s => `- ${s.name}: ${s.count} total classes attended`).join('\n')}

OVERALL STATISTICS:
- Total Students: ${totalStudentCount}
- Active Students: ${activeStudentCount}
- Inactive Students: ${inactiveStudentCount}
- Classes Available: ${classes.length} different types
- Total Attendance Records: ${allAttendance.length}
- Past Year Attendance: ${pastYearAttendance.length} classes
- Average Attendance Rate: ${allAttendance.length > 0 ? ((allAttendance.filter((a) => a.status === "attended").length / allAttendance.length) * 100).toFixed(1) : 0}%

REVENUE (Last 30 days):
- Total: $${revenueStats.total.toLocaleString()}
- Transactions: ${revenueStats.count}

When answering questions about specific students:
1. Search the student list above (case-insensitive)
2. Provide their total attendance count
3. If they're not in the top 100, note they have fewer classes than the 100th student
4. Be specific and data-driven in your response

Provide thoughtful, actionable insights based on this data.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: dataContext,
        },
        {
          role: "user",
          content: query,
        },
      ],
      max_tokens: MAX_TOKENS_PER_QUERY,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "No response generated";
    const tokensUsed = completion.usage?.total_tokens || 0;

    await storage.createAIQuery({
      organizationId,
      userId,
      query,
      response,
      tokensUsed,
    });

    return { response, tokensUsed };
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
