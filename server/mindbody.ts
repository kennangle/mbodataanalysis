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
  ClassId: number;  // Lowercase "Id" per actual API response
  StartDateTime: string;  // Not "VisitDateTime"
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
  private apiCallCounter: number = 0;

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

    // Track API call
    this.apiCallCounter++;

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
        
        // Track retry API call
        this.apiCallCounter++;
        
        return await retryResponse.json();
      }
      
      throw new Error(`Mindbody API error: ${response.statusText}`);
    }

    return await response.json();
  }

  // API call tracking methods
  getApiCallCount(): number {
    return this.apiCallCounter;
  }

  resetApiCallCount(): void {
    this.apiCallCounter = 0;
  }

  private async fetchAllPages<T>(
    organizationId: string,
    baseEndpoint: string,
    resultsKey: string,
    pageSize: number = 200
  ): Promise<{ results: T[], apiCalls: number }> {
    let allResults: T[] = [];
    let offset = 0;
    let hasMorePages = true;
    let apiCallCount = 0;

    while (hasMorePages) {
      const separator = baseEndpoint.includes('?') ? '&' : '?';
      const endpoint = `${baseEndpoint}${separator}Limit=${pageSize}&Offset=${offset}`;
      const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
      apiCallCount++; // Track API call

      const results = data[resultsKey] || [];
      allResults = allResults.concat(results);

      const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;
      
      if (pagination) {
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
        }
      } else {
        // No pagination info, assume single page
        hasMorePages = false;
      }
    }

    return { results: allResults, apiCalls: apiCallCount };
  }

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
    // Match by StartDateTime since ClassId in visits != ClassScheduleId in schedules
    const schedules = await storage.getClassSchedules(organizationId);
    const schedulesByTime = new Map(schedules.map(s => [s.startTime.toISOString(), s]));
    
    // DEBUG: Log sample schedule times
    const sampleTimes = Array.from(schedulesByTime.keys()).slice(0, 5);
    console.log('=== DEBUG: Sample schedule times in map ===');
    console.log(sampleTimes);
    console.log('===========================================');
    
    let imported = 0;
    let processedStudents = 0;
    let totalVisitsFound = 0;
    let unmatchedClassIds = new Set<string>();
    
    // Process students sequentially in this batch
    for (const student of studentBatch) {
      try {
        const { results: visits } = await this.fetchAllPages<MindbodyVisit>(
          organizationId,
          `/client/clientvisits?ClientId=${student.mindbodyClientId}&StartDate=${startDate.toISOString()}&EndDate=${endDate.toISOString()}`,
          'Visits',
          200
        );
        
        if (visits.length > 0) {
          totalVisitsFound += visits.length;
          // DEBUG: Log first visit structure to understand API response
          if (totalVisitsFound <= 3) {
            console.log('=== DEBUG: Visit structure from API ===');
            console.log(JSON.stringify(visits[0], null, 2));
            console.log('=======================================');
          }
        }
        
        for (const visit of visits) {
          try {
            if (!visit.ClassId || !visit.StartDateTime) {
              // Log first few skipped visits with full data
              if (totalVisitsFound <= 5) {
                console.log(`Skipping visit for client ${student.mindbodyClientId}. Full visit data:`, JSON.stringify(visit, null, 2));
              }
              continue;
            }
            
            // Match by StartDateTime instead of ClassId
            const visitStartTime = new Date(visit.StartDateTime).toISOString();
            const schedule = schedulesByTime.get(visitStartTime);
            
            // DEBUG: Log first few match attempts
            if (totalVisitsFound <= 5) {
              console.log(`=== DEBUG: Matching attempt ===`);
              console.log(`Visit time: ${visit.StartDateTime} -> ${visitStartTime}`);
              console.log(`Found schedule: ${schedule ? 'YES' : 'NO'}`);
              console.log(`==============================`);
            }
            
            if (!schedule) {
              unmatchedClassIds.add(`${visit.ClassId} at ${visit.StartDateTime}`);
              continue;
            }
            
            await storage.createAttendance({
              organizationId,
              studentId: student.id,
              scheduleId: schedule.id,
              attendedAt: new Date(visit.StartDateTime),
              status: visit.SignedIn ? "attended" : "noshow",
            });
            
            imported++;
          } catch (error) {
            console.error(`Failed to import visit for client ${student.mindbodyClientId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch visits for client ${student.mindbodyClientId}:`, error);
      }
      
      // Update progress after each student to show real-time API count
      processedStudents++;
      await onProgress(startStudentIndex + processedStudents, totalStudents);
    }
    
    // Log diagnostic information
    if (totalVisitsFound > 0) {
      console.log(`Visit import batch: Found ${totalVisitsFound} visits, imported ${imported} attendance records`);
      if (unmatchedClassIds.size > 0) {
        console.log(`Unmatched ClassIds (visits skipped):`, Array.from(unmatchedClassIds).slice(0, 10).join(', '));
      }
    }
    
    const nextStudentIndex = endIndex;
    const completed = nextStudentIndex >= totalStudents;
    
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
    startOffset: number = 0,
    cachedStudents?: any[] // OPTIMIZATION: Accept pre-loaded students for ID lookup
  ): Promise<{ imported: number; nextStudentIndex: number; completed: boolean }> {
    // Fetch sales at SITE LEVEL (not per-client) as ClientId filter may not be supported
    const SALES_BATCH_SIZE = 200; // Fetch 200 sales at a time
    const BATCH_DELAY = 250;
    
    // Load all students once for ID lookup
    const allStudents = cachedStudents || await storage.getStudents(organizationId, 100000);
    const studentMap = new Map(allStudents.map(s => [s.mindbodyClientId, s.id]));
    
    const dateFormat = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateFormat = endDate.toISOString().split('T')[0];
    
    console.log(`[Sales Import] Fetching site-level sales, date range: ${dateFormat} to ${endDateFormat}`);
    
    try {
      // Make a test call to see what we get
      const testEndpoint = `/sale/sales?StartDate=${dateFormat}&EndDate=${endDateFormat}&Limit=10&Offset=0`;
      console.log(`[Sales Import] Test endpoint: ${testEndpoint}`);
      
      const testData = await this.makeAuthenticatedRequest(organizationId, testEndpoint);
      console.log(`[Sales Import] API Response:`, JSON.stringify(testData).substring(0, 500));
      console.log(`[Sales Import] PaginationResponse:`, JSON.stringify(testData.PaginationResponse));
      
      const totalResults = testData.PaginationResponse?.TotalResults || 0;
      
      // If /sale/sales returns no results, fall back to /sale/transactions
      if (totalResults === 0) {
        console.log(`[Sales Import] /sale/sales returned 0 results, falling back to /sale/transactions`);
        
        // Use ISO datetime format with timezone for transactions endpoint
        const startDateTime = startDate.toISOString(); // e.g., 2024-01-01T00:00:00.000Z
        const endDateTime = endDate.toISOString();
        
        const { results: transactions } = await this.fetchAllPages<any>(
          organizationId,
          `/sale/transactions?StartSaleDateTime=${startDateTime}&EndSaleDateTime=${endDateTime}`,
          'Transactions',
          SALES_BATCH_SIZE
        );
        
        console.log(`[Sales Import] Fetched ${transactions.length} transactions from /sale/transactions`);
        
        let imported = 0;
        
        for (const transaction of transactions) {
          try {
            // Get student ID from ClientId
            const studentId = studentMap.get(transaction.ClientId?.toString());
            
            // Build description from payment info
            const paymentMethod = transaction.Method || 'Unknown';
            const lastFour = transaction.LastFour || 'N/A';
            const status = transaction.Status || 'Unknown';
            const description = `${paymentMethod} payment ending in ${lastFour} (${status})`;
            
            await storage.upsertRevenue({
              organizationId,
              studentId: studentId || null,
              mindbodySaleId: transaction.Id?.toString() || null,
              mindbodyItemId: null, // Transactions don't have item-level detail
              amount: transaction.Amount?.toString() || '0',
              type: paymentMethod,
              description,
              transactionDate: new Date(transaction.SaleDateTime || transaction.CreatedDateTime),
            });
            imported++;
          } catch (error) {
            console.error(`Failed to import transaction ${transaction.Id}:`, error);
          }
        }
        
        await onProgress(transactions.length, transactions.length);
        console.log(`[Sales Import] Completed - imported ${imported} revenue records from ${transactions.length} transactions`);
        
        return { imported, nextStudentIndex: transactions.length, completed: true };
      }
      
      // If /sale/sales has results, use it for detailed line-item data
      const { results: sales } = await this.fetchAllPages<any>(
        organizationId,
        `/sale/sales?StartDate=${dateFormat}&EndDate=${endDateFormat}`,
        'Sales',
        SALES_BATCH_SIZE
      );
      
      console.log(`[Sales Import] Fetched ${sales.length} total sales`);
      
      let imported = 0;
      let matchedClients = 0;
      let unmatchedClients = 0;
      
      for (const sale of sales) {
        try {
          // Skip if missing sale date/time
          if (!sale.SaleDateTime) {
            console.log(`Sale ${sale.Id} missing SaleDateTime, skipping`);
            continue;
          }
          
          // Get student ID from MindbodyClientId (optional - client may not be in our students table)
          const studentId = studentMap.get(sale.ClientId?.toString()) || null;
          if (studentId) {
            matchedClients++;
          } else {
            unmatchedClients++;
          }
          
          // Handle both array and single object for PurchasedItems
          const purchasedItems = Array.isArray(sale.PurchasedItems) 
            ? sale.PurchasedItems 
            : (sale.PurchasedItems ? [sale.PurchasedItems] : []);
          
          if (purchasedItems.length === 0) {
            // Log first few instances for debugging
            if (imported < 5) {
              console.log(`Sale ${sale.Id} has no purchased items, structure:`, JSON.stringify(sale).substring(0, 300));
            }
            continue;
          }
          
          // Create a revenue record for each purchased item (line-item tracking)
          let itemIndex = 0;
          for (const item of purchasedItems) {
            try {
              // DEBUG: Log first few items to see structure
              if (itemIndex < 3) {
                console.log(`[DEBUG] PurchasedItem #${itemIndex}:`, JSON.stringify(item, null, 2));
                itemIndex++;
              }
              
              // Skip items with no amount or zero amount
              if (!item.AmountPaid && item.AmountPaid !== 0) {
                console.log(`[DEBUG] Skipping item - no AmountPaid field. Available fields:`, Object.keys(item));
                continue;
              }
              if (item.AmountPaid === 0) {
                console.log(`[DEBUG] Skipping item - AmountPaid is 0`);
                continue;
              }
              
              // Build description: Item name + quantity (if > 1)
              let description = item.Name || item.Description || 'Unknown item';
              if (item.Quantity && item.Quantity > 1) {
                description = `${description} (Qty: ${item.Quantity})`;
              }
              
              await storage.upsertRevenue({
                organizationId,
                studentId,
                mindbodySaleId: sale.Id?.toString() || null,
                mindbodyItemId: item.Id?.toString() || null,
                amount: item.AmountPaid.toString(),
                type: item.Type || 'Unknown',
                description,
                transactionDate: new Date(sale.SaleDateTime),
              });
              imported++;
            } catch (error) {
              console.error(`Failed to import purchased item from sale ${sale.Id}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to process sale ${sale.Id}:`, error);
        }
      }
      
      // Since fetchAllPages gets everything, we're done in one call
      await onProgress(sales.length, sales.length);
      
      console.log(`[Sales Import] Completed - imported ${imported} revenue records from ${sales.length} sales`);
      console.log(`[Sales Import] Client matching: ${matchedClients} matched, ${unmatchedClients} unmatched (linked to null studentId)`);
      
      return { imported, nextStudentIndex: sales.length, completed: true };
    } catch (error) {
      console.error(`Failed to fetch site-level sales:`, error);
      throw error;
    }
  }

  async createWebhookSubscription(
    organizationId: string,
    eventType: string,
    webhookUrl: string,
    referenceId?: string
  ): Promise<{ subscriptionId: string; messageSignatureKey: string }> {
    const userToken = await this.getUserToken();
    const WEBHOOKS_API_BASE = "https://api.mindbodyonline.com/webhooks/v6";
    
    const org = await storage.getOrganization(organizationId);
    if (!org?.mindbodySiteId) {
      throw new Error("Mindbody site ID not configured");
    }

    const response = await fetch(`${WEBHOOKS_API_BASE}/subscriptions`, {
      method: 'POST',
      headers: {
        'Api-Key': process.env.MINDBODY_API_KEY || '',
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        webhookUrl,
        eventSchemaVersion: 1,
        referenceId: referenceId || organizationId,
        siteIds: [parseInt(org.mindbodySiteId)],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create webhook subscription: ${error}`);
    }

    const data = await response.json();
    return {
      subscriptionId: data.id,
      messageSignatureKey: data.messageSignatureKey,
    };
  }

  async deleteWebhookSubscription(
    organizationId: string,
    mindbodySubscriptionId: string
  ): Promise<void> {
    const userToken = await this.getUserToken();
    const WEBHOOKS_API_BASE = "https://api.mindbodyonline.com/webhooks/v6";

    const response = await fetch(`${WEBHOOKS_API_BASE}/subscriptions/${mindbodySubscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Api-Key': process.env.MINDBODY_API_KEY || '',
        'Authorization': `Bearer ${userToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete webhook subscription: ${error}`);
    }
  }

  verifyWebhookSignature(
    payload: string,
    signatureHeader: string,
    signatureKey: string
  ): boolean {
    const crypto = require('crypto');
    
    // Compute HMAC-SHA256
    const hmac = crypto.createHmac('sha256', signatureKey);
    const hash = hmac.update(payload).digest('base64');
    const computedSignature = `sha256=${hash}`;
    
    // Timing-safe comparison
    const expected = Buffer.from(computedSignature, 'utf8');
    const received = Buffer.from(signatureHeader || '', 'utf8');
    
    if (expected.length !== received.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expected, received);
  }
}

export const mindbodyService = new MindbodyService();
