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
  ClassId: number; // Lowercase "Id" per actual API response
  StartDateTime: string; // Not "VisitDateTime"
  SignedIn: boolean;
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
    const domains = process.env.REPLIT_DOMAINS.split(",");
    return `https://${domains[0]}/api/mindbody/callback`;
  }
  return "http://localhost:5000/api/mindbody/callback";
}

export class MindbodyService {
  private tokenCache: Map<string, { token: string; expiryTime: number }> = new Map();
  private apiCallCounter: number = 0;

  async exchangeCodeForTokens(code: string, organizationId: string): Promise<void> {
    const redirectUri = getRedirectUri();

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: process.env.MINDBODY_CLIENT_ID || "",
      client_secret: process.env.MINDBODY_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      scope: "email profile openid offline_access Mindbody.Api.Public.v6",
    });

    const response = await fetch("https://signin.mindbodyonline.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange authorization code: ${response.status}`);
    }

    const data: MindbodyTokenResponse = await response.json();

    await storage.updateOrganizationTokens(organizationId, data.access_token, data.refresh_token);
  }

  async refreshAccessToken(organizationId: string): Promise<string> {
    const org = await storage.getOrganization(organizationId);
    if (!org || !org.mindbodyRefreshToken) {
      throw new Error("No refresh token available");
    }

    const apiKey = org.mindbodyApiKey || process.env.MINDBODY_API_KEY;

    const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey || "",
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

    await storage.updateOrganizationTokens(organizationId, data.access_token, data.refresh_token);

    return data.access_token;
  }

  private async getUserToken(organizationId?: string, overrideCredentials?: {
    siteId: string;
    apiKey: string;
    username: string;
    password: string;
  }): Promise<string> {
    if (!organizationId && !overrideCredentials) {
      throw new Error("Organization ID required for authentication");
    }

    // If override credentials provided, don't use cache (for testing)
    if (overrideCredentials) {
      const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": overrideCredentials.apiKey,
          SiteId: overrideCredentials.siteId,
        },
        body: JSON.stringify({
          Username: overrideCredentials.username,
          Password: overrideCredentials.password,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`[Mindbody Test] Auth failed (${response.status}):`, responseText);
        let errorMessage = `Failed to authenticate with Mindbody (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.Error?.Message) {
            errorMessage = `Mindbody Error: ${errorData.Error.Message}`;
          }
        } catch (e) {
          // If we can't parse the error, just use the status
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[Mindbody Test] Invalid JSON response:`, responseText);
        throw new Error(`Mindbody auth returned invalid JSON`);
      }

      return data.AccessToken;
    }

    // Check cached token for this organization
    const now = Date.now();
    const cached = this.tokenCache.get(organizationId!);
    if (cached && now < cached.expiryTime) {
      return cached.token;
    }

    // Get organization credentials
    const org = await storage.getOrganization(organizationId!);
    let apiKey = org?.mindbodyApiKey || process.env.MINDBODY_API_KEY;
    let siteId = org?.mindbodySiteId || "133";
    let username = org?.mindbodyStaffUsername || "_YHC";
    let password = org?.mindbodyStaffPassword || process.env.MINDBODY_CLIENT_SECRET;

    if (!apiKey || !password) {
      throw new Error("Mindbody API credentials not configured. Please set them in Settings.");
    }

    // Source credentials username must be prefixed with underscore
    const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
        SiteId: siteId,
      },
      body: JSON.stringify({
        Username: username,
        Password: password,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to authenticate with Mindbody (${response.status}). Please check your credentials in Settings.`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Mindbody auth returned invalid JSON`);
    }

    // Cache token per organization for 55 minutes (expires in 60)
    this.tokenCache.set(organizationId!, {
      token: data.AccessToken,
      expiryTime: now + 55 * 60 * 1000,
    });

    return data.AccessToken;
  }

  // Clear cached token for an organization (call when credentials change)
  clearTokenCache(organizationId: string): void {
    this.tokenCache.delete(organizationId);
  }

  // Public method to test credentials without caching
  async testCredentials(credentials: {
    siteId: string;
    apiKey: string;
    username: string;
    password: string;
  }): Promise<boolean> {
    try {
      const token = await this.getUserToken(undefined, credentials);
      return !!token;
    } catch (error) {
      throw error;
    }
  }

  async makeAuthenticatedRequest(
    organizationId: string,
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<any> {
    const MAX_RETRIES = 3;
    const REQUEST_TIMEOUT = 60000; // 60 second timeout

    // Get organization credentials
    const org = await storage.getOrganization(organizationId);
    const apiKey = org?.mindbodyApiKey || process.env.MINDBODY_API_KEY;
    const siteId = org?.mindbodySiteId || "133";

    if (!apiKey) {
      throw new Error("Mindbody API credentials not configured. Please set them in Settings.");
    }

    // Get user token for staff-level access
    const userToken = await this.getUserToken(organizationId);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          "Api-Key": apiKey,
          SiteId: siteId,
          Authorization: `Bearer ${userToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Track API call
      this.apiCallCounter++;

      if (!response.ok) {
        const errorText = await response.text();

        // Clear cached token on authentication errors and retry once
        if (response.status === 401) {
          this.clearTokenCache(organizationId);

          // Retry once with fresh token
          const newToken = await this.getUserToken(organizationId);
          const retryResponse = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
            ...options,
            headers: {
              ...options.headers,
              "Content-Type": "application/json",
              "Api-Key": apiKey,
              SiteId: siteId,
              Authorization: `Bearer ${newToken}`,
            },
          });

          if (!retryResponse.ok) {
            throw new Error(`Mindbody API error: ${retryResponse.statusText}`);
          }

          // Track retry API call
          this.apiCallCounter++;

          return await retryResponse.json();
        }

        // Retry on 500/503 errors with exponential backoff
        if ((response.status === 500 || response.status === 503) && retryCount < MAX_RETRIES) {
          const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

          // Wait for backoff period
          await new Promise((resolve) => setTimeout(resolve, backoffMs));

          // Retry the request
          return this.makeAuthenticatedRequest(organizationId, endpoint, options, retryCount + 1);
        }

        // Try to parse error response for more details
        let errorDetails = response.statusText;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.Error) {
            errorDetails = `${response.statusText} - ${errorJson.Error.Message || JSON.stringify(errorJson.Error)}`;
          } else {
            errorDetails = `${response.statusText} - ${JSON.stringify(errorJson)}`;
          }
        } catch {
          // If not JSON, use the text directly
          if (errorText && errorText.length < 500) {
            errorDetails = `${response.statusText} - ${errorText}`;
          }
        }
        
        throw new Error(`Mindbody API error (${endpoint}): ${errorDetails}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout error
      if (error.name === 'AbortError') {
        throw new Error(`Mindbody API request timeout (${REQUEST_TIMEOUT/1000}s): ${endpoint}`);
      }
      
      throw error;
    }
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
  ): Promise<{ results: T[]; apiCalls: number }> {
    let allResults: T[] = [];
    let offset = 0;
    let hasMorePages = true;
    let apiCallCount = 0;

    while (hasMorePages) {
      const separator = baseEndpoint.includes("?") ? "&" : "?";
      const endpoint = `${baseEndpoint}${separator}Limit=${pageSize}&Offset=${offset}`;
      const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
      apiCallCount++; // Track API call

      const results = data[resultsKey] || [];
      allResults = allResults.concat(results);

      const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;

      if (pagination) {
        // Guard against offset exceeding total results
        if (offset >= pagination.TotalResults) {
          hasMorePages = false;
        }
        // Check if we've retrieved all results
        else if (allResults.length >= pagination.TotalResults || results.length === 0) {
          hasMorePages = false;
        } else {
          // Use actual results length as the increment (PageSize may not reflect true count)
          const actualPageSize =
            results.length > 0 ? results.length : pagination.RequestedLimit || pageSize;

          offset += actualPageSize;
        }
      } else {
        // No pagination info, assume single page
        hasMorePages = false;
      }
    }

    return { results: allResults, apiCalls: apiCallCount };
  }

  private async fetchPage<T>(
    organizationId: string,
    baseEndpoint: string,
    resultsKey: string,
    offset: number,
    pageSize: number = 200
  ): Promise<{ results: T[]; totalResults: number; hasMore: boolean }> {
    const separator = baseEndpoint.includes("?") ? "&" : "?";
    const endpoint = `${baseEndpoint}${separator}Limit=${pageSize}&Offset=${offset}`;
    const data = await this.makeAuthenticatedRequest(organizationId, endpoint);

    const results = data[resultsKey] || [];
    const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;
    const totalResults = pagination?.TotalResults || 0;
    
    // Check if there are more pages
    const hasMore = pagination 
      ? (offset + results.length < totalResults && results.length > 0)
      : false;

    return { results, totalResults, hasMore };
  }

  async importClientsResumable(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    startOffset: number = 0,
    jobId?: string
  ): Promise<{ imported: number; updated: number; nextOffset: number; completed: boolean }> {
    const BATCH_SIZE = 200;
    const BATCH_DELAY = 0; // No delay - removed for faster imports

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
    const studentMap = new Map(existingStudents.map((s) => [s.mindbodyClientId, s]));

    let imported = 0;
    let updated = 0;

    // Process this batch
    for (const client of clients) {
      try {
        // Skip clients with missing critical data (name)
        if (!client.FirstName || !client.LastName) {
          const reason = `Missing name (FirstName: ${client.FirstName || 'null'}, LastName: ${client.LastName || 'null'})`;
          
          // Log to database for reporting
          try {
            await storage.createSkippedImportRecord({
              organizationId,
              importJobId: jobId || null,
              dataType: "client",
              mindbodyId: client.Id,
              reason,
              rawData: JSON.stringify(client),
            });
          } catch (dbError) {
            // Don't fail the import if logging skipped record fails
            console.error(`Failed to log skipped client ${client.Id}:`, dbError);
          }
          
          continue;
        }

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
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
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
    const BATCH_DELAY = 0; // No delay - removed for faster imports

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
    const classMap = new Map(existingClasses.map((c) => [c.mindbodyClassId, c]));

    let imported = 0;

    // Process this batch
    for (const mbClass of classes) {
      try {
        if (
          !mbClass.ClassDescription?.Id ||
          !mbClass.ClassScheduleId ||
          !mbClass.StartDateTime ||
          !mbClass.EndDateTime
        ) {
          continue;
        }

        let classRecord = classMap.get(mbClass.ClassDescription.Id.toString());

        if (!classRecord) {
          classRecord = await storage.createClass({
            organizationId,
            mindbodyClassId: mbClass.ClassDescription.Id.toString(),
            name: mbClass.ClassDescription.Name || "Unknown Class",
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
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }

    return { imported, nextOffset, completed };
  }

  async getVisitsByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Use Mindbody's UtilityFunction_VisitsV4 to fetch all visits in date range
    // This is MUCH faster than per-client API calls
    const formatDate = (date: Date): string => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`; // MM/DD/YYYY format
    };

    const endpoint = '/utility/function';
    const token = await this.getUserToken(organizationId);
    const org = await storage.getOrganization(organizationId);
    const apiKey = org?.mindbodyApiKey || process.env.MINDBODY_API_KEY;
    const siteId = org?.mindbodySiteId || "133";

    const response = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': apiKey || '',
        'SiteID': siteId,
        'Authorization': token,
      },
      body: JSON.stringify({
        FunctionName: 'UtilityFunction_VisitsV4',
        FunctionParams: [
          {
            ParamName: '@StartDate',
            ParamValue: formatDate(startDate),
            ParamDataType: 'datetime',
          },
          {
            ParamName: '@EndDate',
            ParamValue: formatDate(endDate),
            ParamDataType: 'datetime',
          },
          {
            ParamName: '@ModifiedDate',
            ParamValue: '01/01/1900',
            ParamDataType: 'datetime',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Mindbody Utility Function] Error:`, errorText);
      throw new Error(`Failed to fetch visits via utility function (${response.status})`);
    }

    const data = await response.json();
    console.log(`[Mindbody Utility Function] Response:`, JSON.stringify(data).substring(0, 500));
    
    // The response format may vary, so we'll need to inspect it
    // Typically it returns a Table or Results array
    return data.Table || data.Results || data;
  }

  async importVisitsViaUtilityFunction(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    jobId?: string
  ): Promise<{ imported: number; skipped: number }> {
    console.log(`[Visits Utility] Fetching all visits from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Fetch ALL visits in one API call!
    const visits = await this.getVisitsByDateRange(organizationId, startDate, endDate);
    console.log(`[Visits Utility] Received ${visits.length} visits from utility function`);
    
    if (visits.length === 0) {
      console.log(`[Visits Utility] No visits found for date range`);
      return { imported: 0, skipped: 0 };
    }
    
    // Log sample data structure
    console.log(`[Visits Utility] Sample visit data:`, JSON.stringify(visits[0]).substring(0, 200));
    
    // Load students and schedules for matching
    const [students, schedules] = await Promise.all([
      storage.getStudents(organizationId, 100000),
      storage.getClassSchedules(organizationId),
    ]);
    
    console.log(`[Visits Utility] Loaded ${students.length} students and ${schedules.length} schedules`);
    
    // Create lookup maps - try multiple ID fields from utility function response
    const studentsByClientId = new Map(
      students.filter(s => s.mindbodyClientId).map(s => [s.mindbodyClientId!, s])
    );
    
    // Create multiple schedule lookup strategies
    const schedulesByTimeUTC = new Map(
      schedules.map(s => [s.startTime.toISOString(), s])
    );
    const schedulesByClassScheduleId = new Map(
      schedules.filter(s => s.mindbodyScheduleId).map(s => [s.mindbodyScheduleId!, s])
    );
    
    let imported = 0;
    let skipped = 0;
    const total = visits.length;
    
    // Process visits in batches to avoid overwhelming the database
    const BATCH_SIZE = 500;
    for (let i = 0; i < visits.length; i += BATCH_SIZE) {
      const batch = visits.slice(i, Math.min(i + BATCH_SIZE, visits.length));
      
      for (const visit of batch) {
        try {
          // Match student by ID field (from utility function)
          const clientId = String(visit.ID || visit.ClientId || visit.ClientID || visit.UniqueID);
          const student = studentsByClientId.get(clientId);
          
          if (!student) {
            skipped++;
            await storage.createSkippedImportRecord({
              organizationId,
              importJobId: jobId || null,
              dataType: "visits",
              mindbodyId: clientId,
              reason: "Student not found",
              rawData: JSON.stringify(visit),
            }).catch(() => {});
            continue;
          }
          
          // Parse visit date/time from utility function response
          // VisitDate format: "2/1/2024" or "2024-02-01"
          // StartTime format: "10:00 AM" or "10:00:00"
          let visitDateTime: Date;
          
          if (visit.VisitDate && visit.StartTime) {
            try {
              const dateStr = String(visit.VisitDate);
              const timeStr = String(visit.StartTime);
              
              // Extract date components from VisitDate (handles ISO or US format)
              let year: number, month: number, day: number;
              
              if (dateStr.includes('T')) {
                // ISO format: "2024-02-29T00:00:00"
                const dateObj = new Date(dateStr);
                year = dateObj.getFullYear();
                month = dateObj.getMonth(); // 0-indexed
                day = dateObj.getDate();
              } else if (dateStr.includes('/')) {
                // US format: "2/1/2024"
                const parts = dateStr.split('/').map(Number);
                month = parts[0] - 1; // 0-indexed
                day = parts[1];
                year = parts[2];
              } else if (dateStr.includes('-') && !dateStr.includes('T')) {
                // ISO date only: "2024-02-01"
                const parts = dateStr.split('-').map(Number);
                year = parts[0];
                month = parts[1] - 1; // 0-indexed
                day = parts[2];
              } else {
                throw new Error(`Unrecognized date format: ${dateStr}`);
              }
              
              // Extract time components from StartTime
              let hours: number, minutes: number, seconds: number;
              
              if (timeStr.includes('T') || timeStr.includes('-')) {
                // Full datetime: "1899-12-30T16:30:00" - extract just the time part
                const timeObj = new Date(timeStr);
                hours = timeObj.getHours();
                minutes = timeObj.getMinutes();
                seconds = timeObj.getSeconds();
              } else {
                // Time string: "10:00 AM" or "10:00:00"
                const timeParts = timeStr.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
                if (!timeParts) {
                  throw new Error(`Invalid time format: ${timeStr}`);
                }
                
                hours = parseInt(timeParts[1]);
                minutes = parseInt(timeParts[2]);
                seconds = timeParts[3] ? parseInt(timeParts[3]) : 0;
                const ampm = timeParts[4];
                
                // Convert to 24-hour format if needed
                if (ampm) {
                  if (ampm.toUpperCase() === 'PM' && hours !== 12) {
                    hours += 12;
                  } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
                    hours = 0;
                  }
                }
              }
              
              // Combine date and time components
              visitDateTime = new Date(year, month, day, hours, minutes, seconds);
              
              // Validate the date
              if (isNaN(visitDateTime.getTime())) {
                throw new Error(`Invalid combined date/time: ${dateStr} + ${timeStr}`);
              }
            } catch (error) {
              skipped++;
              await storage.createSkippedImportRecord({
                organizationId,
                importJobId: jobId || null,
                dataType: "visits",
                mindbodyId: clientId,
                reason: `Failed to parse date/time: ${error instanceof Error ? error.message : 'Unknown error'}`,
                rawData: JSON.stringify(visit),
              }).catch(() => {});
              continue;
            }
          } else if (visit.StartDateTime) {
            visitDateTime = new Date(visit.StartDateTime);
            if (isNaN(visitDateTime.getTime())) {
              skipped++;
              await storage.createSkippedImportRecord({
                organizationId,
                importJobId: jobId || null,
                dataType: "visits",
                mindbodyId: clientId,
                reason: "Invalid StartDateTime",
                rawData: JSON.stringify(visit),
              }).catch(() => {});
              continue;
            }
          } else if (visit.ClassDateTime) {
            visitDateTime = new Date(visit.ClassDateTime);
            if (isNaN(visitDateTime.getTime())) {
              skipped++;
              await storage.createSkippedImportRecord({
                organizationId,
                importJobId: jobId || null,
                dataType: "visits",
                mindbodyId: clientId,
                reason: "Invalid ClassDateTime",
                rawData: JSON.stringify(visit),
              }).catch(() => {});
              continue;
            }
          } else {
            skipped++;
            await storage.createSkippedImportRecord({
              organizationId,
              importJobId: jobId || null,
              dataType: "visits",
              mindbodyId: clientId,
              reason: "No visit date/time found",
              rawData: JSON.stringify(visit),
            }).catch(() => {});
            continue;
          }
          
          // Try matching schedule by ClassScheduleID first (most reliable)
          let schedule = null;
          if (visit.ClassScheduleID) {
            schedule = schedulesByClassScheduleId.get(String(visit.ClassScheduleID));
          }
          
          // Fallback: try matching by timestamp
          if (!schedule) {
            schedule = schedulesByTimeUTC.get(visitDateTime.toISOString());
          }
          
          if (!schedule) {
            skipped++;
            await storage.createSkippedImportRecord({
              organizationId,
              importJobId: jobId || null,
              dataType: "visits",
              mindbodyId: clientId,
              reason: "No matching class schedule found",
              rawData: JSON.stringify(visit),
            }).catch(() => {});
            continue;
          }
          
          // Determine status from utility function response
          // Status field or SignedIn boolean
          let status: "attended" | "noshow" = "attended";
          if (visit.Status) {
            const statusLower = String(visit.Status).toLowerCase();
            if (statusLower.includes("noshow") || statusLower.includes("no show")) {
              status = "noshow";
            }
          } else if (visit.SignedIn !== undefined) {
            status = visit.SignedIn ? "attended" : "noshow";
          }
          
          // Create attendance record
          await storage.createAttendance({
            organizationId,
            studentId: student.id,
            scheduleId: schedule.id,
            attendedAt: visitDateTime,
            status,
          });
          
          imported++;
        } catch (error) {
          console.error(`[Visits Utility] Error processing visit:`, error);
          skipped++;
        }
      }
      
      // Report progress after each batch
      await onProgress(Math.min(i + BATCH_SIZE, total), total);
    }
    
    console.log(`[Visits Utility] Complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
  }

  async importVisitsResumable(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    onProgress: (current: number, total: number) => Promise<void>,
    startOffset: number = 0,
    schedulesByTime?: Map<string, any> // Pass cached schedules to avoid reloading
  ): Promise<{ imported: number; nextStudentIndex: number; completed: boolean; schedulesByTime?: Map<string, any> }> {
    // MEMORY-OPTIMIZED: Process clients in small batches (Mindbody requires ClientId parameter)
    // This prevents memory exhaustion while allowing resumable imports
    
    const CLIENTS_PER_BATCH = 200; // Process 200 clients at a time
    const BATCH_DELAY = 0; // No delay for faster imports
    
    // Load schedules once, reuse on subsequent batches
    if (!schedulesByTime) {
      try {
        const schedules = await storage.getClassSchedules(organizationId);
        schedulesByTime = new Map(schedules.map((s) => [s.startTime.toISOString(), s]));
        console.log(`[Visits] Loaded ${schedules.length} class schedules for matching`);
      } catch (error) {
        console.error(`[Visits] CRITICAL ERROR loading schedules:`, error);
        throw new Error(`Failed to load class schedules: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Get total student count for progress tracking
    const allStudents = await storage.getStudents(organizationId, 100000);
    const totalStudents = allStudents.length;
    
    // Get batch of students to process (CRITICAL: Don't process all at once)
    const studentsToProcess = allStudents
      .filter(s => s.mindbodyClientId)
      .slice(startOffset, startOffset + CLIENTS_PER_BATCH);
      
    console.log(`[Visits] Processing clients ${startOffset} to ${startOffset + studentsToProcess.length} of ${totalStudents}`);
    
    // Mindbody API requires YYYY-MM-DD format
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    let imported = 0;
    let skippedNoSchedule = 0;
    
    try {
      // PARALLEL PROCESSING: Process multiple clients simultaneously for faster imports
      // Using p-limit to control concurrency and avoid overwhelming Mindbody API
      const pLimit = (await import('p-limit')).default;
      const limit = pLimit(10); // Process 10 clients in parallel
      
      const processClient = async (student: any) => {
        try {
          const endpoint = `/client/clientvisits?ClientId=${student.mindbodyClientId}&StartDate=${startDateStr}&EndDate=${endDateStr}`;
          const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
          
          const visits: MindbodyVisit[] = data.Visits || [];
          
          let clientImported = 0;
          let clientSkipped = 0;
          
          // Process visits for this client
          for (const visit of visits) {
            try {
              if (!visit.StartDateTime) {
                continue;
              }
              
              // Match visit to schedule by start time
              const visitStartTime = new Date(visit.StartDateTime).toISOString();
              const schedule = schedulesByTime.get(visitStartTime);
              
              if (!schedule) {
                clientSkipped++;
                // Log skipped record
                await storage.createSkippedImportRecord({
                  organizationId,
                  dataType: "visits",
                  mindbodyId: student.mindbodyClientId || "unknown",
                  reason: "No matching class schedule found",
                  rawData: JSON.stringify({
                    clientId: student.mindbodyClientId,
                    startDateTime: visit.StartDateTime,
                    className: visit.ClassId || "Unknown"
                  }),
                }).catch(err => {
                  console.error(`[Visits] Failed to log skipped record:`, err);
                });
                continue;
              }
              
              // Create attendance record
              await storage.createAttendance({
                organizationId,
                studentId: student.id,
                scheduleId: schedule.id,
                attendedAt: new Date(visit.StartDateTime),
                status: visit.SignedIn ? "attended" : "noshow",
              });
              
              clientImported++;
            } catch (error) {
              console.error(`[Visits] Failed to import visit for client ${student.mindbodyClientId}:`, error);
            }
          }
          
          return { imported: clientImported, skipped: clientSkipped };
        } catch (error: any) {
          // Skip clients that cause errors (they may not exist in Mindbody anymore)
          if (error.message?.includes("404") || error.message?.includes("Not Found")) {
            console.log(`[Visits] Client ${student.mindbodyClientId} not found in Mindbody, skipping`);
          } else {
            console.error(`[Visits] Error fetching visits for client ${student.mindbodyClientId}:`, error);
          }
          return { imported: 0, skipped: 0 };
        }
      };
      
      // Process all clients in parallel with concurrency limit
      const results = await Promise.all(
        studentsToProcess.map(student => limit(() => processClient(student)))
      );
      
      // Aggregate results
      for (const result of results) {
        imported += result.imported;
        skippedNoSchedule += result.skipped;
      }
      
      const nextOffset = startOffset + studentsToProcess.length;
      const completed = nextOffset >= totalStudents;
      
      console.log(`[Visits] Batch complete: imported ${imported}, skipped (no schedule: ${skippedNoSchedule})`);
      
      // Update progress
      await onProgress(nextOffset, totalStudents);
      
      // Delay before next batch (unless completed)
      if (!completed) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
      
      return { 
        imported, 
        nextStudentIndex: nextOffset, 
        completed, 
        schedulesByTime 
      };
    } catch (error) {
      console.error(`[Visits] Error in batch processing:`, error);
      throw error;
    }
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
    const BATCH_DELAY = 0; // No delay - removed for faster imports

    // Load all students once for ID lookup
    const allStudents = cachedStudents || (await storage.getStudents(organizationId, 100000));
    const studentMap = new Map(allStudents.map((s) => [s.mindbodyClientId, s.id]));

    const dateFormat = startDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const endDateFormat = endDate.toISOString().split("T")[0];

    try {
      // Make a test call to see what we get
      const testEndpoint = `/sale/sales?StartDate=${dateFormat}&EndDate=${endDateFormat}&Limit=10&Offset=0`;

      const testData = await this.makeAuthenticatedRequest(organizationId, testEndpoint);

      const totalResults = testData.PaginationResponse?.TotalResults || 0;

      // If /sale/sales returns no results, try /sale/transactions as fallback
      if (totalResults === 0) {

        // Use ISO datetime format with timezone for transactions endpoint
        const startDateTime = startDate.toISOString(); // e.g., 2024-01-01T00:00:00.000Z
        const endDateTime = endDate.toISOString();

        let imported = 0;
        let skipped = 0;
        let transactionOffset = 0;
        let hasMoreTransactions = true;
        let totalProcessed = 0;


        while (hasMoreTransactions) {
          const { results: transactions, totalResults, hasMore } = await this.fetchPage<any>(
            organizationId,
            `/sale/transactions?StartSaleDateTime=${startDateTime}&EndSaleDateTime=${endDateTime}`,
            "Transactions",
            transactionOffset,
            SALES_BATCH_SIZE
          );

          // Break if no results (safety check)
          if (transactions.length === 0) {
            break;
          }

          hasMoreTransactions = hasMore;

          // Process this page immediately
          for (const transaction of transactions) {
          try {
            // Extract date from nested objects or flat strings
            const dateStr =
              transaction.SaleDateTime ||
              transaction.CreatedDateTime ||
              transaction.TransactionDate ||
              transaction.CompletedDate ||
              transaction.SettlementDate ||
              transaction.SettlementDateTime ||
              // Handle nested date objects (e.g., {DateTime: "2025-10-22..."})
              transaction.TransactionTime?.DateTime ||
              transaction.TransactionTime ||
              transaction.AuthTime?.DateTime ||
              transaction.AuthTime;

            if (!dateStr) {
              skipped++;
              continue;
            }

            const transactionDate = new Date(dateStr);
            if (isNaN(transactionDate.getTime())) {
              skipped++;
              continue;
            }

            // Get student ID from ClientId
            const studentId = studentMap.get(transaction.ClientId?.toString());
            const saleId = transaction.SaleId?.toString();

            // If we have a SaleId, fetch the actual sale details to get line items
            if (saleId) {
              try {
                const saleEndpoint = `/sale/sales/${saleId}`;
                const saleData = await this.makeAuthenticatedRequest(organizationId, saleEndpoint);
                
                if (saleData && saleData.Sale) {
                  const sale = saleData.Sale;
                  
                  // Diagnostic: Log what fee/discount fields exist (no PII)
                  const feeFields = {
                    hasProcessingFee: !!sale.ProcessingFee,
                    hasProcessingFeeAmount: !!sale.ProcessingFeeAmount,
                    hasPaymentProcessingFee: !!sale.PaymentProcessingFee,
                    hasServiceFee: !!sale.ServiceFee,
                    hasServiceFeeAmount: !!sale.ServiceFeeAmount,
                    hasDiscountAmount: !!sale.DiscountAmount,
                    hasTotalDiscounts: !!sale.TotalDiscounts,
                    hasDiscount: !!sale.Discount,
                    hasTaxTotal: !!sale.TaxTotal,
                    hasTax: !!sale.Tax,
                    hasTaxAmount: !!sale.TaxAmount,
                    allSaleKeys: Object.keys(sale).filter(k => k.toLowerCase().includes('fee') || k.toLowerCase().includes('discount') || k.toLowerCase().includes('tax'))
                  };
                  console.log('[Sales Import Debug] Fee/discount fields for sale:', feeFields);
                  
                  // Handle both array and single object for PurchasedItems
                  const purchasedItems = Array.isArray(sale.PurchasedItems)
                    ? sale.PurchasedItems
                    : sale.PurchasedItems
                      ? [sale.PurchasedItems]
                      : [];

                  if (purchasedItems.length > 0) {
                    // Create a revenue record for each purchased item
                    for (const item of purchasedItems) {
                      const itemAmount = 
                        item.Amount ?? 
                        (item.UnitPrice && item.Quantity ? item.UnitPrice * item.Quantity : null);

                      // Skip items with no amount
                      if (!itemAmount && itemAmount !== 0) continue;
                      if (itemAmount === 0) continue;

                      // Build description: Item name + quantity (if > 1)
                      let itemDescription = item.Name || item.Description || "Unknown item";
                      if (item.Quantity && item.Quantity > 1) {
                        itemDescription = `${itemDescription} (Qty: ${item.Quantity})`;
                      }

                      await storage.upsertRevenue({
                        organizationId,
                        studentId: studentId || null,
                        mindbodySaleId: saleId,
                        mindbodyItemId: item.Id?.toString() || item.SaleDetailId?.toString() || null,
                        amount: itemAmount.toString(),
                        type: item.IsService ? "Service" : (item.Type || "Product"),
                        description: itemDescription,
                        transactionDate,
                      });
                      imported++;
                    }
                    
                    // Capture processing fees if present (typically transaction fees charged by payment processor)
                    const processingFee = sale.ProcessingFee || sale.ProcessingFeeAmount || sale.PaymentProcessingFee;
                    if (processingFee && processingFee > 0) {
                      await storage.upsertRevenue({
                        organizationId,
                        studentId: studentId || null,
                        mindbodySaleId: saleId,
                        mindbodyItemId: "fee-processing",
                        amount: processingFee.toString(),
                        type: "Processing Fee",
                        description: "Payment processing fee",
                        transactionDate,
                      });
                      imported++;
                    }
                    
                    // Capture service fees if present
                    const serviceFee = sale.ServiceFee || sale.ServiceFeeAmount;
                    if (serviceFee && serviceFee > 0) {
                      await storage.upsertRevenue({
                        organizationId,
                        studentId: studentId || null,
                        mindbodySaleId: saleId,
                        mindbodyItemId: "fee-service",
                        amount: serviceFee.toString(),
                        type: "Service Fee",
                        description: "Service fee",
                        transactionDate,
                      });
                      imported++;
                    }
                    
                    // Capture discounts as negative revenue (if they reduce the total)
                    const discountAmount = sale.DiscountAmount || sale.TotalDiscounts || sale.Discount;
                    if (discountAmount && discountAmount !== 0) {
                      // Discounts are typically positive numbers representing the amount reduced
                      // We store them as negative to show the reduction in revenue
                      await storage.upsertRevenue({
                        organizationId,
                        studentId: studentId || null,
                        mindbodySaleId: saleId,
                        mindbodyItemId: "discount",
                        amount: (-Math.abs(discountAmount)).toString(),
                        type: "Discount",
                        description: "Sale discount applied",
                        transactionDate,
                      });
                      imported++;
                    }
                    
                    // Capture tax if present (optional - for complete revenue tracking)
                    const taxAmount = sale.TaxTotal || sale.Tax || sale.TaxAmount;
                    if (taxAmount && taxAmount > 0) {
                      await storage.upsertRevenue({
                        organizationId,
                        studentId: studentId || null,
                        mindbodySaleId: saleId,
                        mindbodyItemId: "tax",
                        amount: taxAmount.toString(),
                        type: "Tax",
                        description: "Sales tax",
                        transactionDate,
                      });
                      imported++;
                    }
                  } else {
                    // No line items, fall back to payment transaction record
                    throw new Error("No purchased items in sale");
                  }
                } else {
                  throw new Error("Sale data not found");
                }
              } catch (saleError) {
                // If fetching sale details fails, fall back to basic transaction record
                
                const paymentMethod = transaction.Method || transaction.CardType || "Payment";
                const lastFour = transaction.CCLastFour || transaction.LastFour || "";
                const status = transaction.Status || "Completed";
                const description = lastFour 
                  ? `${paymentMethod} ending in ${lastFour} (${status})`
                  : `${paymentMethod} (${status})`;

                await storage.upsertRevenue({
                  organizationId,
                  studentId: studentId || null,
                  mindbodySaleId: saleId || transaction.TransactionId?.toString() || null,
                  mindbodyItemId: null,
                  amount: transaction.Amount?.toString() || "0",
                  type: paymentMethod,
                  description,
                  transactionDate,
                });
                imported++;
              }
            } else {
              // No SaleId, just use basic transaction data
              const paymentMethod = transaction.Method || transaction.CardType || "Payment";
              const lastFour = transaction.CCLastFour || transaction.LastFour || "";
              const status = transaction.Status || "Completed";
              const description = lastFour 
                ? `${paymentMethod} ending in ${lastFour} (${status})`
                : `${paymentMethod} (${status})`;

              await storage.upsertRevenue({
                organizationId,
                studentId: studentId || null,
                mindbodySaleId: transaction.TransactionId?.toString() || null,
                mindbodyItemId: null,
                amount: transaction.Amount?.toString() || "0",
                type: paymentMethod,
                description,
                transactionDate,
              });
              imported++;
            }
          } catch (error) {
            console.error(`Failed to import transaction ${transaction.TransactionId || transaction.Id}:`, error);
            skipped++;
          }
        }

        // Move to next page
        transactionOffset += transactions.length;
        totalProcessed += transactions.length;

        // Report progress
        await onProgress(totalProcessed, totalResults);

        // Allow garbage collection and I/O fairness between pages
        await new Promise(resolve => setImmediate(resolve));
      }

        return { imported, nextStudentIndex: totalProcessed, completed: true };
      }

      // If /sale/sales has results, use it for detailed line-item data
      let imported = 0;
      let matchedClients = 0;
      let unmatchedClients = 0;
      let salesOffset = 0;
      let hasMoreSales = true;
      let totalProcessed = 0;
      let totalFilteredOut = 0; // Track sales filtered by date


      while (hasMoreSales) {
        const { results: sales, totalResults, hasMore } = await this.fetchPage<any>(
          organizationId,
          `/sale/sales?StartDate=${dateFormat}&EndDate=${endDateFormat}`,
          "Sales",
          salesOffset,
          SALES_BATCH_SIZE
        );

        // Break if no results (safety check)
        if (sales.length === 0) {
          break;
        }

        hasMoreSales = hasMore;


        // Process this page immediately
        let filteredOutThisPage = 0;
        
        for (const sale of sales) {
        try {
          // Skip if missing sale date/time
          if (!sale.SaleDateTime) {
            continue;
          }

          // Client-side date filtering (in case API ignores date parameters)
          // Use lenient comparison: sale must be >= startDate and < (endDate + 1 day)
          const saleDate = new Date(sale.SaleDateTime);
          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          if (saleDate < startDate || saleDate >= nextDay) {
            // Sale is outside our requested date range, skip it
            filteredOutThisPage++;
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
            : sale.PurchasedItems
              ? [sale.PurchasedItems]
              : [];

          if (purchasedItems.length === 0) {
            continue;
          }

          // Create a revenue record for each purchased item (line-item tracking)
          for (const item of purchasedItems) {
            try {
              // Get amount from correct field: Amount, or calculate from UnitPrice * Quantity
              const amount =
                item.Amount ??
                (item.UnitPrice && item.Quantity ? item.UnitPrice * item.Quantity : null);

              // Skip items with no amount or zero amount
              if (!amount && amount !== 0) continue;
              if (amount === 0) continue;

              // Build description: Item name + quantity (if > 1)
              let description = item.Name || item.Description || "Unknown item";
              if (item.Quantity && item.Quantity > 1) {
                description = `${description} (Qty: ${item.Quantity})`;
              }

              await storage.upsertRevenue({
                organizationId,
                studentId,
                mindbodySaleId: sale.Id?.toString() || null,
                mindbodyItemId: item.Id?.toString() || item.SaleDetailId?.toString() || null,
                amount: amount.toString(),
                type: item.IsService ? "Service" : item.Type || "Product",
                description,
                transactionDate: new Date(sale.SaleDateTime),
              });
              imported++;
            } catch (error) {
              console.error(`Failed to import purchased item from sale ${sale.Id}:`, error);
            }
          }
          
          // Capture processing fees if present
          const processingFee = sale.ProcessingFee || sale.ProcessingFeeAmount || sale.PaymentProcessingFee;
          if (processingFee && processingFee > 0) {
            await storage.upsertRevenue({
              organizationId,
              studentId,
              mindbodySaleId: sale.Id?.toString() || null,
              mindbodyItemId: "fee-processing",
              amount: processingFee.toString(),
              type: "Processing Fee",
              description: "Payment processing fee",
              transactionDate: new Date(sale.SaleDateTime),
            });
            imported++;
          }
          
          // Capture service fees if present
          const serviceFee = sale.ServiceFee || sale.ServiceFeeAmount;
          if (serviceFee && serviceFee > 0) {
            await storage.upsertRevenue({
              organizationId,
              studentId,
              mindbodySaleId: sale.Id?.toString() || null,
              mindbodyItemId: "fee-service",
              amount: serviceFee.toString(),
              type: "Service Fee",
              description: "Service fee",
              transactionDate: new Date(sale.SaleDateTime),
            });
            imported++;
          }
          
          // Capture discounts as negative revenue
          const discountAmount = sale.DiscountAmount || sale.TotalDiscounts || sale.Discount;
          if (discountAmount && discountAmount !== 0) {
            await storage.upsertRevenue({
              organizationId,
              studentId,
              mindbodySaleId: sale.Id?.toString() || null,
              mindbodyItemId: "discount",
              amount: (-Math.abs(discountAmount)).toString(),
              type: "Discount",
              description: "Sale discount applied",
              transactionDate: new Date(sale.SaleDateTime),
            });
            imported++;
          }
          
          // Capture tax if present
          const taxAmount = sale.TaxTotal || sale.Tax || sale.TaxAmount;
          if (taxAmount && taxAmount > 0) {
            await storage.upsertRevenue({
              organizationId,
              studentId,
              mindbodySaleId: sale.Id?.toString() || null,
              mindbodyItemId: "tax",
              amount: taxAmount.toString(),
              type: "Tax",
              description: "Sales tax",
              transactionDate: new Date(sale.SaleDateTime),
            });
            imported++;
          }
        } catch (error) {
          console.error(`Failed to process sale ${sale.Id}:`, error);
        }
      }

        // Accumulate filtering stats
        totalFilteredOut += filteredOutThisPage;
        
        // Move to next page
        salesOffset += sales.length;
        totalProcessed += sales.length;

        // Report progress
        await onProgress(totalProcessed, totalResults);

        // Allow garbage collection and I/O fairness between pages
        await new Promise(resolve => setImmediate(resolve));
      }

      return { imported, nextStudentIndex: totalProcessed, completed: true };
    } catch (error) {
      console.error(`Failed to fetch site-level sales:`, error);
      throw error;
    }
  }

  async importServicesResumable(
    organizationId: string,
    onProgress: (current: number, total: number) => Promise<void>,
    startOffset: number = 0
  ): Promise<{ imported: number; updated: number; nextOffset: number; completed: boolean }> {
    const BATCH_SIZE = 200;

    // Fetch pricing options/services from Mindbody
    const endpoint = `/sale/services?Limit=${BATCH_SIZE}&Offset=${startOffset}`;
    const data = await this.makeAuthenticatedRequest(organizationId, endpoint);

    const pagination: MindbodyPaginationResponse | undefined = data.PaginationResponse;
    const totalResults = pagination?.TotalResults || 0;
    const services: any[] = data.Services || [];

    if (services.length === 0) {
      return { imported: 0, updated: 0, nextOffset: startOffset, completed: true };
    }

    // Load existing pricing options for duplicate detection
    const existingPricingOptions = await storage.getPricingOptions(organizationId);
    const pricingMap = new Map(existingPricingOptions.map((p) => [p.mindbodyServiceId, p]));

    let imported = 0;
    let updated = 0;

    // Process this batch
    for (const service of services) {
      try {
        if (!service.Id || !service.Name) {
          continue;
        }

        const serviceId = service.Id.toString();
        const existingOption = pricingMap.get(serviceId);

        const pricingData = {
          organizationId,
          mindbodyServiceId: serviceId,
          name: service.Name,
          description: service.Description || null,
          onlineDescription: service.OnlineDescription || null,
          price: service.Price ? service.Price.toString() : null,
          onlinePrice: service.OnlinePrice ? service.OnlinePrice.toString() : null,
          taxRate: service.TaxRate ? service.TaxRate.toString() : null,
          taxIncluded: service.TaxIncluded || false,
          programId: service.ProgramId ? service.ProgramId.toString() : null,
          defaultTimeLength: service.DefaultTimeLength || null,
          type: service.Type || null,
          count: service.Count || null,
        };

        if (existingOption) {
          await storage.updatePricingOption(existingOption.id, pricingData);
          updated++;
        } else {
          await storage.createPricingOption(pricingData);
          imported++;
        }
      } catch (error) {
        console.error(`Failed to import service ${service.Id}:`, error);
      }
    }

    const nextOffset = startOffset + services.length;
    const completed = nextOffset >= totalResults;

    // Report progress
    await onProgress(nextOffset, totalResults);

    return { imported, updated, nextOffset, completed };
  }

  async createWebhookSubscription(
    organizationId: string,
    eventType: string,
    webhookUrl: string,
    referenceId?: string
  ): Promise<{ subscriptionId: string; messageSignatureKey: string }> {
    const userToken = await this.getUserToken(organizationId);
    const WEBHOOKS_API_BASE = "https://api.mindbodyonline.com/webhooks/v6";

    const org = await storage.getOrganization(organizationId);
    if (!org?.mindbodySiteId) {
      throw new Error("Mindbody site ID not configured");
    }

    const apiKey = org?.mindbodyApiKey || process.env.MINDBODY_API_KEY;

    const requestBody = {
      eventType,
      webhookUrl,
      eventSchemaVersion: 1,
      referenceId: referenceId || organizationId,
      siteIds: [parseInt(org.mindbodySiteId)],
    };


    const response = await fetch(`${WEBHOOKS_API_BASE}/subscriptions`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey || "",
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });


    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Mindbody webhook subscription failed: ${response.status} - ${responseText}`);
      throw new Error(`Failed to create webhook subscription (${response.status}): ${responseText.substring(0, 300)}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Failed to parse webhook subscription response as JSON: ${responseText.substring(0, 500)}`);
      throw new Error(`Mindbody returned invalid JSON response for webhook subscription: ${responseText.substring(0, 200)}`);
    }

    return {
      subscriptionId: data.id,
      messageSignatureKey: data.messageSignatureKey,
    };
  }

  async deleteWebhookSubscription(
    organizationId: string,
    mindbodySubscriptionId: string
  ): Promise<void> {
    const userToken = await this.getUserToken(organizationId);
    const WEBHOOKS_API_BASE = "https://api.mindbodyonline.com/webhooks/v6";

    const org = await storage.getOrganization(organizationId);
    const apiKey = org?.mindbodyApiKey || process.env.MINDBODY_API_KEY;

    const response = await fetch(`${WEBHOOKS_API_BASE}/subscriptions/${mindbodySubscriptionId}`, {
      method: "DELETE",
      headers: {
        "Api-Key": apiKey || "",
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete webhook subscription: ${error}`);
    }
  }

  verifyWebhookSignature(payload: string, signatureHeader: string, signatureKey: string): boolean {
    const crypto = require("crypto");

    // Compute HMAC-SHA256
    const hmac = crypto.createHmac("sha256", signatureKey);
    const hash = hmac.update(payload).digest("base64");
    const computedSignature = `sha256=${hash}`;

    // Timing-safe comparison
    const expected = Buffer.from(computedSignature, "utf8");
    const received = Buffer.from(signatureHeader || "", "utf8");

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, received);
  }
}

export const mindbodyService = new MindbodyService();
