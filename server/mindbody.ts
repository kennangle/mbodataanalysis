import { storage } from "./storage";

interface MindbodyTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface MindbodyClient {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  MobilePhone: string;
  Status: string;
  CreationDate: string;
}

interface MindbodyClass {
  ClassScheduleId: number;
  ClassDescription: {
    Id: number;
    Name: string;
    Description: string;
  };
  Staff: {
    Name: string;
  };
  MaxCapacity: number;
  StartDateTime: string;
  EndDateTime: string;
  Location: {
    Name: string;
  };
}

interface MindbodyVisit {
  ClientId: string;
  ClassId: number;
  VisitDateTime: string;
  SignedIn: boolean;
}

interface MindbodySale {
  Id: number;
  SaleDateTime: string;
  ClientId: string;
  PurchasedItems: Array<{
    Type: string;
    Description: string;
    AmountPaid: number;
  }>;
}

const MINDBODY_API_BASE = "https://api.mindbodyonline.com/public/v6";

function getRedirectUri(): string {
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}/api/mindbody/callback`;
  }
  return 'http://localhost:5000/api/mindbody/callback';
}

export class MindbodyService {
  async exchangeCodeForTokens(code: string, organizationId: string): Promise<void> {
    const redirectUri = getRedirectUri();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.MINDBODY_CLIENT_ID || '',
      client_secret: process.env.MINDBODY_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      scope: 'email profile openid offline_access Mindbody.Api.Public.v6'
    });

    const response = await fetch('https://signin.mindbodyonline.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Failed to exchange authorization code: ${response.status}`);
    }

    const data: MindbodyTokenResponse = await response.json();
    
    await storage.updateOrganizationTokens(
      organizationId,
      data.access_token,
      data.refresh_token
    );
  }

  async refreshAccessToken(organizationId: string): Promise<string> {
    const org = await storage.getOrganization(organizationId);
    if (!org || !org.mindbodyRefreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.MINDBODY_API_KEY || "",
      },
      body: JSON.stringify({
        refresh_token: org.mindbodyRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const data: MindbodyTokenResponse = await response.json();
    
    await storage.updateOrganizationTokens(
      organizationId,
      data.access_token,
      data.refresh_token
    );

    return data.access_token;
  }

  async makeAuthenticatedRequest(
    organizationId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const apiKey = process.env.MINDBODY_API_KEY;
    const siteId = "133"; // Your site ID
    
    if (!apiKey) {
      throw new Error("MINDBODY_API_KEY not configured");
    }

    const response = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "Api-Key": apiKey,
        "SiteId": siteId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mindbody API error: ${response.status} - ${errorText}`);
      console.error(`Request URL: ${MINDBODY_API_BASE}${endpoint}`);
      throw new Error(`Mindbody API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async importClients(organizationId: string): Promise<number> {
    // Get clients modified in the last 12 months
    // IMPORTANT: Mindbody API uses PascalCase parameters (LastModifiedDate, not lastModifiedDate)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const data = await this.makeAuthenticatedRequest(
      organizationId,
      `/client/clients?Limit=200&Offset=0&LastModifiedDate=${startDate.toISOString()}`
    );

    const clients: MindbodyClient[] = data.Clients || [];
    let imported = 0;

    for (const client of clients) {
      try {
        await storage.createStudent({
          organizationId,
          mindbodyClientId: client.Id,
          firstName: client.FirstName,
          lastName: client.LastName,
          email: client.Email || null,
          phone: client.MobilePhone || null,
          status: client.Status === "Active" ? "active" : "inactive",
          joinDate: client.CreationDate ? new Date(client.CreationDate) : null,
          membershipType: null,
        });
        imported++;
      } catch (error) {
        console.error(`Failed to import client ${client.Id}:`, error);
      }
    }

    return imported;
  }

  async importClasses(organizationId: string): Promise<number> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const data = await this.makeAuthenticatedRequest(
      organizationId,
      `/class/classes?StartDateTime=${startDate.toISOString()}&EndDateTime=${endDate.toISOString()}&Limit=500`
    );

    const classes: MindbodyClass[] = data.Classes || [];
    let imported = 0;

    for (const mbClass of classes) {
      try {
        // Skip if missing required fields
        if (!mbClass.ClassDescription?.Id || !mbClass.ClassScheduleId || !mbClass.StartDateTime || !mbClass.EndDateTime) {
          continue;
        }

        const existingClass = await storage.getClasses(organizationId);
        let classRecord = existingClass.find(
          c => c.mindbodyClassId === mbClass.ClassDescription.Id.toString()
        );

        if (!classRecord) {
          classRecord = await storage.createClass({
            organizationId,
            mindbodyClassId: mbClass.ClassDescription.Id.toString(),
            name: mbClass.ClassDescription.Name || 'Unknown Class',
            description: mbClass.ClassDescription.Description || null,
            instructorName: mbClass.Staff?.Name || null,
            capacity: mbClass.MaxCapacity || null,
            duration: null,
          });
        }

        await storage.createClassSchedule({
          organizationId,
          classId: classRecord.id,
          mindbodyScheduleId: mbClass.ClassScheduleId.toString(),
          startTime: new Date(mbClass.StartDateTime),
          endTime: new Date(mbClass.EndDateTime),
          location: mbClass.Location?.Name || null,
        });

        imported++;
      } catch (error) {
        console.error(`Failed to import class ${mbClass.ClassScheduleId}:`, error);
      }
    }

    return imported;
  }

  async importVisits(organizationId: string): Promise<number> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const data = await this.makeAuthenticatedRequest(
      organizationId,
      `/client/clientvisits?StartDate=${startDate.toISOString()}&Limit=1000`
    );

    const visits: MindbodyVisit[] = data.Visits || [];
    let imported = 0;

    for (const visit of visits) {
      try {
        // Skip if missing required fields
        if (!visit.ClientId || !visit.ClassId || !visit.VisitDateTime) {
          continue;
        }

        const students = await storage.getStudents(organizationId, 1000);
        const student = students.find(s => s.mindbodyClientId === visit.ClientId);
        
        if (!student) continue;

        const schedules = await storage.getClassSchedules(organizationId);
        const schedule = schedules.find(
          s => s.mindbodyScheduleId === visit.ClassId.toString()
        );

        if (!schedule) continue;

        await storage.createAttendance({
          organizationId,
          studentId: student.id,
          scheduleId: schedule.id,
          attendedAt: new Date(visit.VisitDateTime),
          status: visit.SignedIn ? "attended" : "noshow",
        });

        imported++;
      } catch (error) {
        console.error(`Failed to import visit:`, error);
      }
    }

    return imported;
  }

  async importSales(organizationId: string): Promise<number> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const data = await this.makeAuthenticatedRequest(
      organizationId,
      `/sale/sales?StartSaleDateTime=${startDate.toISOString()}&Limit=1000`
    );

    const sales: MindbodySale[] = data.Sales || [];
    let imported = 0;

    for (const sale of sales) {
      try {
        const students = await storage.getStudents(organizationId, 1000);
        const student = students.find(s => s.mindbodyClientId === sale.ClientId);

        for (const item of sale.PurchasedItems) {
          // Skip items without amount information
          if (!item.AmountPaid && item.AmountPaid !== 0) {
            continue;
          }
          
          await storage.createRevenue({
            organizationId,
            studentId: student?.id || null,
            amount: item.AmountPaid.toString(),
            type: item.Type || 'Unknown',
            description: item.Description || 'No description',
            transactionDate: new Date(sale.SaleDateTime),
          });
          imported++;
        }
      } catch (error) {
        console.error(`Failed to import sale ${sale.Id}:`, error);
      }
    }

    return imported;
  }

  async importAllData(organizationId: string): Promise<{
    clients: number;
    classes: number;
    visits: number;
    sales: number;
  }> {
    const clients = await this.importClients(organizationId);
    const classes = await this.importClasses(organizationId);
    
    // Skip visits and sales for now - these endpoints require individual ClientIds
    // TODO: Implement per-client import for visits and sales
    const visits = 0;
    const sales = 0;

    return { clients, classes, visits, sales };
  }
}

export const mindbodyService = new MindbodyService();
