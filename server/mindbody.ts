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

interface MindbodyPaginationResponse {
  RequestedLimit: number;
  RequestedOffset: number;
  PageSize: number;
  TotalResults: number;
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

  private async getUserToken(): Promise<string> {
    const apiKey = process.env.MINDBODY_API_KEY;
    const clientSecret = process.env.MINDBODY_CLIENT_SECRET;
    const siteId = "133";
    
    if (!apiKey || !clientSecret) {
      throw new Error("MINDBODY_API_KEY and MINDBODY_CLIENT_SECRET required");
    }

    // Source credentials username must be prefixed with underscore
    const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
        "SiteId": siteId,
      },
      body: JSON.stringify({
        Username: "_YHC", // Source name with underscore prefix
        Password: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to get user token: ${response.status} - ${errorText}`);
      throw new Error(`Failed to authenticate with Mindbody: ${response.statusText}`);
    }

    const data = await response.json();
    return data.AccessToken;
  }

  async makeAuthenticatedRequest(
    organizationId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const apiKey = process.env.MINDBODY_API_KEY;
    const siteId = "133";
    
    if (!apiKey) {
      throw new Error("MINDBODY_API_KEY not configured");
    }

    // Get user token for staff-level access
    const userToken = await this.getUserToken();

    const response = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "Api-Key": apiKey,
        "SiteId": siteId,
        "Authorization": `Bearer ${userToken}`,
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

  private async fetchAllPages<T>(
    organizationId: string,
    baseEndpoint: string,
    resultsKey: string,
    pageSize: number = 200
  ): Promise<T[]> {
    let allResults: T[] = [];
    let offset = 0;
    let hasMorePages = true;

    console.log(`Starting paginated fetch from ${baseEndpoint} with page size ${pageSize}`);

    while (hasMorePages) {
      const separator = baseEndpoint.includes('?') ? '&' : '?';
      const endpoint = `${baseEndpoint}${separator}Limit=${pageSize}&Offset=${offset}`;
      
      console.log(`Fetching page at offset ${offset}...`);
      const data = await this.makeAuthenticatedRequest(organizationId, endpoint);

      const results = data[resultsKey] || [];
      allResults = allResults.concat(results);

      const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;
      
      if (pagination) {
        console.log(`Page received: ${results.length} items (Total: ${pagination.TotalResults}, Retrieved so far: ${allResults.length})`);
        
        // Guard against offset exceeding total results
        if (offset >= pagination.TotalResults) {
          console.warn(`Offset ${offset} exceeds TotalResults ${pagination.TotalResults}, stopping pagination`);
          hasMorePages = false;
        }
        // Check if we've retrieved all results
        else if (allResults.length >= pagination.TotalResults || results.length === 0) {
          hasMorePages = false;
        } else {
          // Use actual results length as the increment (PageSize may not reflect true count)
          const actualPageSize = results.length > 0 ? results.length : (pagination.RequestedLimit || pageSize);
          
          // Verify offset won't skip records
          if (pagination.PageSize > results.length && results.length > 0) {
            console.warn(`PageSize (${pagination.PageSize}) > actual results (${results.length}), using results.length`);
          }
          
          offset += actualPageSize;
          console.log(`Next offset will be ${offset} (incremented by ${actualPageSize} actual items returned)`);
        }
      } else {
        // No pagination info, assume single page
        console.log(`No pagination info, treating as single page: ${results.length} items`);
        hasMorePages = false;
      }
    }

    console.log(`Pagination complete: ${allResults.length} total items fetched`);
    return allResults;
  }

  async importClients(organizationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    // Use provided startDate or default to last 12 months
    const lastModifiedDate = startDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 12);
      return date;
    })();
    
    // Fetch all pages of clients using pagination
    const clients = await this.fetchAllPages<MindbodyClient>(
      organizationId,
      `/client/clients?LastModifiedDate=${lastModifiedDate.toISOString()}`,
      'Clients',
      200
    );

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

  async importClasses(organizationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    // Use provided dates or default to 12 months past, 1 month future
    const classStartDate = startDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 12);
      return date;
    })();
    
    const classEndDate = endDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      return date;
    })();

    // Fetch all pages of classes using pagination
    const classes = await this.fetchAllPages<MindbodyClass>(
      organizationId,
      `/class/classes?StartDateTime=${classStartDate.toISOString()}&EndDateTime=${classEndDate.toISOString()}`,
      'Classes',
      200
    );

    // Load existing classes once for efficient lookup
    console.log('Loading existing classes for import...');
    const existingClasses = await storage.getClasses(organizationId);
    const classMap = new Map(existingClasses.map(c => [c.mindbodyClassId, c]));

    let imported = 0;

    for (const mbClass of classes) {
      try {
        // Skip if missing required fields
        if (!mbClass.ClassDescription?.Id || !mbClass.ClassScheduleId || !mbClass.StartDateTime || !mbClass.EndDateTime) {
          continue;
        }

        let classRecord = classMap.get(mbClass.ClassDescription.Id.toString());

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
          // Add to map for future lookups in this import session
          classMap.set(classRecord.mindbodyClassId!, classRecord);
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

  async importVisits(organizationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const visitStartDate = startDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 12);
      return date;
    })();

    // Fetch all pages of visits using pagination
    const visits = await this.fetchAllPages<MindbodyVisit>(
      organizationId,
      `/client/clientvisits?StartDate=${visitStartDate.toISOString()}`,
      'Visits',
      200
    );

    // Load students and schedules once for efficient lookup
    console.log('Loading students for visit import...');
    const students = await storage.getStudents(organizationId, 100000);
    const studentMap = new Map(students.map(s => [s.mindbodyClientId, s]));
    
    console.log('Loading class schedules for visit import...');
    const schedules = await storage.getClassSchedules(organizationId);
    const scheduleMap = new Map(schedules.map(s => [s.mindbodyScheduleId, s]));

    let imported = 0;

    for (const visit of visits) {
      try {
        // Skip if missing required fields
        if (!visit.ClientId || !visit.ClassId || !visit.VisitDateTime) {
          continue;
        }

        const student = studentMap.get(visit.ClientId);
        if (!student) continue;

        const schedule = scheduleMap.get(visit.ClassId.toString());
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

  async importSales(organizationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const saleStartDate = startDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 12);
      return date;
    })();

    // Fetch all pages of sales using pagination
    const sales = await this.fetchAllPages<MindbodySale>(
      organizationId,
      `/sale/sales?StartSaleDateTime=${saleStartDate.toISOString()}`,
      'Sales',
      200
    );

    // Load students once for efficient lookup
    console.log('Loading students for sales import...');
    const students = await storage.getStudents(organizationId, 100000);
    const studentMap = new Map(students.map(s => [s.mindbodyClientId, s]));

    let imported = 0;

    for (const sale of sales) {
      try {
        const student = studentMap.get(sale.ClientId);

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

  async importAllData(
    organizationId: string, 
    config?: {
      startDate?: string;
      endDate?: string;
      dataTypes?: {
        clients?: boolean;
        classes?: boolean;
        visits?: boolean;
        sales?: boolean;
      };
    }
  ): Promise<{
    clients: number;
    classes: number;
    visits: number;
    sales: number;
  }> {
    const startDate = config?.startDate ? new Date(config.startDate) : undefined;
    const endDate = config?.endDate ? new Date(config.endDate) : undefined;

    const dataTypes = config?.dataTypes || {
      clients: true,
      classes: true,
      visits: false,
      sales: false,
    };

    let clients = 0;
    let classes = 0;
    let visits = 0;
    let sales = 0;

    if (dataTypes.clients) {
      clients = await this.importClients(organizationId, startDate, endDate);
    }

    if (dataTypes.classes) {
      classes = await this.importClasses(organizationId, startDate, endDate);
    }

    if (dataTypes.visits) {
      visits = await this.importVisits(organizationId, startDate, endDate);
    }

    if (dataTypes.sales) {
      sales = await this.importSales(organizationId, startDate, endDate);
    }

    return { clients, classes, visits, sales };
  }
}

export const mindbodyService = new MindbodyService();
