import { storage } from "./storage";
import pLimit from "p-limit";

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
  private cachedUserToken: string | null = null;
  private tokenExpiryTime: number = 0;

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
    // Return cached token if still valid (expires in 60 minutes, we cache for 55)
    const now = Date.now();
    if (this.cachedUserToken && now < this.tokenExpiryTime) {
      return this.cachedUserToken;
    }

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
    
    // Cache token for 55 minutes (expires in 60)
    this.cachedUserToken = data.AccessToken;
    this.tokenExpiryTime = now + (55 * 60 * 1000);
    
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
      
      // Clear cached token on authentication errors and retry once
      if (response.status === 401) {
        console.log('Authentication error detected, clearing token cache and retrying...');
        this.cachedUserToken = null;
        this.tokenExpiryTime = 0;
        
        // Retry once with fresh token
        const newToken = await this.getUserToken();
        const retryResponse = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
          ...options,
          headers: {
            ...options.headers,
            "Content-Type": "application/json",
            "Api-Key": apiKey,
            "SiteId": siteId,
            "Authorization": `Bearer ${newToken}`,
          },
        });
        
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          console.error(`Mindbody API retry failed: ${retryResponse.status} - ${retryErrorText}`);
          throw new Error(`Mindbody API error: ${retryResponse.statusText}`);
        }
        
        return await retryResponse.json();
      }
      
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

    // Load existing students for duplicate detection
    console.log('Loading existing students for duplicate detection...');
    const existingStudents = await storage.getStudents(organizationId, 100000);
    const studentMap = new Map(existingStudents.map(s => [s.mindbodyClientId, s]));

    let imported = 0;
    let updated = 0;

    for (const client of clients) {
      try {
        const existingStudent = studentMap.get(client.Id);
        
        if (existingStudent) {
          // Update existing student
          await storage.updateStudent(existingStudent.id, {
            firstName: client.FirstName,
            lastName: client.LastName,
            email: client.Email || null,
            phone: client.MobilePhone || null,
            status: client.Status === "Active" ? "active" : "inactive",
            joinDate: client.CreationDate ? new Date(client.CreationDate) : null,
          });
          updated++;
        } else {
          // Create new student
          const newStudent = await storage.createStudent({
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
          studentMap.set(client.Id, newStudent); // Add to map for future lookups
          imported++;
        }
      } catch (error) {
        console.error(`Failed to import client ${client.Id}:`, error);
      }
    }

    console.log(`Client import complete: ${imported} new, ${updated} updated`);
    return imported + updated;
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

    // Load students and schedules once for efficient lookup
    console.log('Loading students for visit import...');
    const students = await storage.getStudents(organizationId, 100000);
    
    console.log('Loading class schedules for visit import...');
    const schedules = await storage.getClassSchedules(organizationId);
    const scheduleMap = new Map(schedules.map(s => [s.mindbodyScheduleId, s]));

    let totalImported = 0;
    const CONCURRENCY_LIMIT = 25; // Increased to 25 concurrent requests (under Mindbody's 30 req/sec limit)
    const limit = pLimit(CONCURRENCY_LIMIT);
    
    console.log(`Processing ${students.length} clients with ${CONCURRENCY_LIMIT} concurrent requests...`);

    // Process students with rate limiting
    const importPromises = students.map((student, index) =>
      limit(async () => {
        try {
          const visits = await this.fetchAllPages<MindbodyVisit>(
            organizationId,
            `/client/clientvisits?ClientId=${student.mindbodyClientId}&StartDate=${visitStartDate.toISOString()}`,
            'Visits',
            200
          );

          let imported = 0;
          for (const visit of visits) {
            try {
              if (!visit.ClassId || !visit.VisitDateTime) continue;

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
          
          // Log progress every 50 clients
          if ((index + 1) % 50 === 0) {
            console.log(`Processed ${index + 1}/${students.length} clients...`);
          }
          
          return imported;
        } catch (error) {
          console.error(`Failed to fetch visits for client ${student.mindbodyClientId}:`, error);
          return 0;
        }
      })
    );

    const results = await Promise.all(importPromises);
    totalImported = results.reduce((sum, count) => sum + count, 0);

    console.log(`Visit import complete: ${totalImported} visits imported from ${students.length} clients`);
    return totalImported;
  }

  async importSales(organizationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const saleStartDate = startDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 12);
      return date;
    })();

    // Load students once for efficient lookup
    console.log('Loading students for sales import...');
    const students = await storage.getStudents(organizationId, 100000);

    let totalImported = 0;
    const CONCURRENCY_LIMIT = 25; // Increased to 25 concurrent requests (under Mindbody's 30 req/sec limit)
    const limit = pLimit(CONCURRENCY_LIMIT);
    
    console.log(`Processing ${students.length} clients with ${CONCURRENCY_LIMIT} concurrent requests...`);

    // Process students with rate limiting
    const importPromises = students.map((student, index) =>
      limit(async () => {
        try {
          const sales = await this.fetchAllPages<MindbodySale>(
            organizationId,
            `/sale/sales?ClientId=${student.mindbodyClientId}&StartSaleDateTime=${saleStartDate.toISOString()}`,
            'Sales',
            200
          );

          let imported = 0;
          for (const sale of sales) {
            for (const item of sale.PurchasedItems) {
              try {
                if (!item.AmountPaid && item.AmountPaid !== 0) continue;
                
                await storage.createRevenue({
                  organizationId,
                  studentId: student.id,
                  amount: item.AmountPaid.toString(),
                  type: item.Type || 'Unknown',
                  description: item.Description || 'No description',
                  transactionDate: new Date(sale.SaleDateTime),
                });
                imported++;
              } catch (error) {
                console.error(`Failed to import sale item:`, error);
              }
            }
          }
          
          // Log progress every 50 clients
          if ((index + 1) % 50 === 0) {
            console.log(`Processed ${index + 1}/${students.length} clients...`);
          }
          
          return imported;
        } catch (error) {
          console.error(`Failed to fetch sales for client ${student.mindbodyClientId}:`, error);
          return 0;
        }
      })
    );

    const results = await Promise.all(importPromises);
    totalImported = results.reduce((sum, count) => sum + count, 0);

    console.log(`Sales import complete: ${totalImported} revenue items imported from ${students.length} clients`);
    return totalImported;
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
    console.log('Import config received:', JSON.stringify(config, null, 2));
    
    // Parse dates and ensure they're valid 4-digit years
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (config?.startDate) {
      // Add 'T00:00:00.000Z' to ensure correct parsing as UTC
      const dateStr = config.startDate.includes('T') ? config.startDate : `${config.startDate}T00:00:00.000Z`;
      startDate = new Date(dateStr);
      console.log(`Parsed startDate: ${config.startDate} -> ${startDate.toISOString()}`);
      
      // Validate year is 4 digits
      if (startDate.getFullYear() < 1000 || startDate.getFullYear() > 9999) {
        console.error(`Invalid year in startDate: ${startDate.getFullYear()}`);
        throw new Error(`Invalid start date year: ${startDate.getFullYear()}`);
      }
    }
    
    if (config?.endDate) {
      // Add 'T00:00:00.000Z' to ensure correct parsing as UTC
      const dateStr = config.endDate.includes('T') ? config.endDate : `${config.endDate}T00:00:00.000Z`;
      endDate = new Date(dateStr);
      console.log(`Parsed endDate: ${config.endDate} -> ${endDate.toISOString()}`);
      
      // Validate year is 4 digits
      if (endDate.getFullYear() < 1000 || endDate.getFullYear() > 9999) {
        console.error(`Invalid year in endDate: ${endDate.getFullYear()}`);
        throw new Error(`Invalid end date year: ${endDate.getFullYear()}`);
      }
    }

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

  // Resumable import methods with progress tracking
  async importClientsResumable(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    startOffset: number = 0
  ): Promise<{ imported: number; updated: number; nextOffset: number; completed: boolean }> {
    const BATCH_SIZE = 200;
    const BATCH_DELAY = 200; // 200ms delay between batches
    
    // Fetch first page to get total count
    const endpoint = `/client/clients?LastModifiedDate=${startDate.toISOString()}&Limit=${BATCH_SIZE}&Offset=${startOffset}`;
    const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
    
    const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;
    const totalResults = pagination?.TotalResults || 0;
    const clients: MindbodyClient[] = data.Clients || [];
    
    if (clients.length === 0) {
      return { imported: 0, updated: 0, nextOffset: startOffset, completed: true };
    }
    
    // Load existing students for duplicate detection
    console.log('Loading existing students for duplicate detection...');
    const existingStudents = await storage.getStudents(organizationId, 100000);
    const studentMap = new Map(existingStudents.map(s => [s.mindbodyClientId, s]));
    
    let imported = 0;
    let updated = 0;
    
    // Process this batch
    for (const client of clients) {
      try {
        const existingStudent = studentMap.get(client.Id);
        
        if (existingStudent) {
          await storage.updateStudent(existingStudent.id, {
            firstName: client.FirstName,
            lastName: client.LastName,
            email: client.Email || null,
            phone: client.MobilePhone || null,
            status: client.Status === "Active" ? "active" : "inactive",
            joinDate: client.CreationDate ? new Date(client.CreationDate) : null,
          });
          updated++;
        } else {
          const newStudent = await storage.createStudent({
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
          studentMap.set(client.Id, newStudent);
          imported++;
        }
      } catch (error) {
        console.error(`Failed to import client ${client.Id}:`, error);
      }
    }
    
    const nextOffset = startOffset + clients.length;
    const completed = nextOffset >= totalResults;
    
    // Report progress
    await onProgress(nextOffset, totalResults);
    
    // Delay before next batch (unless completed)
    if (!completed) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
    
    return { imported, updated, nextOffset, completed };
  }

  async importClassesResumable(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    startOffset: number = 0
  ): Promise<{ imported: number; nextOffset: number; completed: boolean }> {
    const BATCH_SIZE = 200;
    const BATCH_DELAY = 200; // 200ms delay between batches
    
    // Fetch first page to get total count
    const endpoint = `/class/classes?StartDateTime=${startDate.toISOString()}&EndDateTime=${endDate.toISOString()}&Limit=${BATCH_SIZE}&Offset=${startOffset}`;
    const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
    
    const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;
    const totalResults = pagination?.TotalResults || 0;
    const classes: MindbodyClass[] = data.Classes || [];
    
    if (classes.length === 0) {
      return { imported: 0, nextOffset: startOffset, completed: true };
    }
    
    // Load existing classes once for efficient lookup
    console.log('Loading existing classes for import...');
    const existingClasses = await storage.getClasses(organizationId);
    const classMap = new Map(existingClasses.map(c => [c.mindbodyClassId, c]));
    
    let imported = 0;
    
    // Process this batch
    for (const mbClass of classes) {
      try {
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
    
    const nextOffset = startOffset + classes.length;
    const completed = nextOffset >= totalResults;
    
    // Report progress
    await onProgress(nextOffset, totalResults);
    
    // Delay before next batch (unless completed)
    if (!completed) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
    
    return { imported, nextOffset, completed };
  }

  async importVisitsResumable(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    startStudentIndex: number = 0
  ): Promise<{ imported: number; nextStudentIndex: number; completed: boolean }> {
    const BATCH_SIZE = 100; // Process 100 students per batch
    const BATCH_DELAY = 250; // 250ms delay between batches
    
    // Load all students once
    const allStudents = await storage.getStudents(organizationId, 100000);
    const totalStudents = allStudents.length;
    
    if (startStudentIndex >= totalStudents) {
      return { imported: 0, nextStudentIndex: startStudentIndex, completed: true };
    }
    
    // Get batch of students to process
    const endIndex = Math.min(startStudentIndex + BATCH_SIZE, totalStudents);
    const studentBatch = allStudents.slice(startStudentIndex, endIndex);
    
    // Load schedules once for efficient lookup
    console.log('Loading class schedules for visit import...');
    const schedules = await storage.getClassSchedules(organizationId);
    const scheduleMap = new Map(schedules.map(s => [s.mindbodyScheduleId, s]));
    
    let imported = 0;
    
    // Process students sequentially in this batch
    for (const student of studentBatch) {
      try {
        const visits = await this.fetchAllPages<MindbodyVisit>(
          organizationId,
          `/client/clientvisits?ClientId=${student.mindbodyClientId}&StartDate=${startDate.toISOString()}`,
          'Visits',
          200
        );
        
        for (const visit of visits) {
          try {
            if (!visit.ClassId || !visit.VisitDateTime) continue;
            
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
      } catch (error) {
        console.error(`Failed to fetch visits for client ${student.mindbodyClientId}:`, error);
      }
    }
    
    const nextStudentIndex = endIndex;
    const completed = nextStudentIndex >= totalStudents;
    
    // Report progress
    await onProgress(nextStudentIndex, totalStudents);
    
    // Delay before next batch (unless completed)
    if (!completed) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
    
    return { imported, nextStudentIndex, completed };
  }

  async importSalesResumable(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    startStudentIndex: number = 0
  ): Promise<{ imported: number; nextStudentIndex: number; completed: boolean }> {
    const BATCH_SIZE = 100; // Process 100 students per batch
    const BATCH_DELAY = 250; // 250ms delay between batches
    
    // Load all students once
    const allStudents = await storage.getStudents(organizationId, 100000);
    const totalStudents = allStudents.length;
    
    if (startStudentIndex >= totalStudents) {
      return { imported: 0, nextStudentIndex: startStudentIndex, completed: true };
    }
    
    // Get batch of students to process
    const endIndex = Math.min(startStudentIndex + BATCH_SIZE, totalStudents);
    const studentBatch = allStudents.slice(startStudentIndex, endIndex);
    
    let imported = 0;
    
    // Process students sequentially in this batch
    for (const student of studentBatch) {
      try {
        const sales = await this.fetchAllPages<MindbodySale>(
          organizationId,
          `/sale/sales?ClientId=${student.mindbodyClientId}&StartSaleDateTime=${startDate.toISOString()}`,
          'Sales',
          200
        );
        
        for (const sale of sales) {
          for (const item of sale.PurchasedItems) {
            try {
              if (!item.AmountPaid && item.AmountPaid !== 0) continue;
              
              await storage.createRevenue({
                organizationId,
                studentId: student.id,
                amount: item.AmountPaid.toString(),
                type: item.Type || 'Unknown',
                description: item.Description || 'No description',
                transactionDate: new Date(sale.SaleDateTime),
              });
              imported++;
            } catch (error) {
              console.error(`Failed to import sale item:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch sales for client ${student.mindbodyClientId}:`, error);
      }
    }
    
    const nextStudentIndex = endIndex;
    const completed = nextStudentIndex >= totalStudents;
    
    // Report progress
    await onProgress(nextStudentIndex, totalStudents);
    
    // Delay before next batch (unless completed)
    if (!completed) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
    
    return { imported, nextStudentIndex, completed };
  }
}

export const mindbodyService = new MindbodyService();
