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

    // Build complete student attendance map
    const studentAttendanceCounts = new Map<string, { name: string; totalClasses: number; pastYearClasses: number; studentId: string }>();
    
    allAttendance.forEach(record => {
      const student = students.find(s => s.id === record.studentId);
      if (student && record.status === "attended") {
        const key = student.id;
        const fullName = `${student.firstName} ${student.lastName}`;
        const attendedDate = new Date(record.attendedAt);
        const isPastYear = attendedDate >= oneYearAgo;
        
        const existing = studentAttendanceCounts.get(key);
        if (existing) {
          existing.totalClasses++;
          if (isPastYear) existing.pastYearClasses++;
        } else {
          studentAttendanceCounts.set(key, {
            name: fullName,
            totalClasses: 1,
            pastYearClasses: isPastYear ? 1 : 0,
            studentId: student.id
          });
        }
      }
    });

    // Try to detect if query mentions a specific student name
    const queryLower = query.toLowerCase();
    let specificStudentData = '';
    
    // Search for any student name mentioned in the query
    for (const [studentId, data] of Array.from(studentAttendanceCounts.entries())) {
      const nameLower = data.name.toLowerCase();
      const nameParts = nameLower.split(' ');
      
      // Check if full name or individual name parts appear in query
      if (queryLower.includes(nameLower) || 
          nameParts.some((part: string) => part.length > 2 && queryLower.includes(part))) {
        specificStudentData += `\n\nSPECIFIC STUDENT FOUND IN QUERY:\n`;
        specificStudentData += `- Name: ${data.name}\n`;
        specificStudentData += `- Total classes attended (all time): ${data.totalClasses}\n`;
        specificStudentData += `- Classes attended (past year): ${data.pastYearClasses}\n`;
        break; // Only include the first match
      }
    }

    const dataContext = `
You are an AI assistant helping analyze fitness and wellness business data for a Mindbody studio.

You have access to the complete attendance database with ${studentAttendanceCounts.size} students who have attended classes.
${specificStudentData}

OVERALL STATISTICS:
- Total Students: ${totalStudentCount}
- Active Students (attended recently): ${activeStudentCount}
- Inactive Students: ${inactiveStudentCount}
- Classes Available: ${classes.length} different types
- Total Attendance Records: ${allAttendance.length}
- Past Year Attendance: ${allAttendance.filter(a => new Date(a.attendedAt) >= oneYearAgo).length} classes
- Average Attendance Rate: ${allAttendance.length > 0 ? ((allAttendance.filter((a) => a.status === "attended").length / allAttendance.length) * 100).toFixed(1) : 0}%

REVENUE (Last 30 days):
- Total: $${revenueStats.total.toLocaleString()}
- Transactions: ${revenueStats.count}

When answering questions about specific students:
- I have searched the database for any student names mentioned in the query
- If found, their attendance data is shown above under "SPECIFIC STUDENT FOUND IN QUERY"
- Use that data to answer specifically and accurately
- If no student was found in the query above, state that the student either doesn't exist in the database or hasn't attended any classes

Provide specific, data-driven answers based on the actual attendance records.
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
