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

    const [totalStudentCount, activeStudentCount, classes, attendance, revenue] = await Promise.all(
      [
        storage.getStudentCount(organizationId),
        storage.getActiveStudentCount(organizationId),
        storage.getClasses(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId),
      ]
    );

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const revenueStats = await storage.getRevenueStats(organizationId, lastMonth, now);

    const inactiveStudentCount = totalStudentCount - activeStudentCount;

    const dataContext = `
You are an AI assistant helping analyze fitness and wellness business data. Here's the current data summary:

Students: ${totalStudentCount} total
- Active: ${activeStudentCount}
- Inactive: ${inactiveStudentCount}

Classes: ${classes.length} different class types

Attendance: ${attendance.length} records
- Average attendance rate: ${attendance.length > 0 ? ((attendance.filter((a) => a.status === "attended").length / attendance.length) * 100).toFixed(1) : 0}%

Revenue (Last 30 days):
- Total: $${revenueStats.total.toLocaleString()}
- Number of transactions: ${revenueStats.count}

Based on this data, please answer the following question thoughtfully and provide actionable insights:
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
