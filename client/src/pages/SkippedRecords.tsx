import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, FileWarning } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SkippedRecord {
  id: string;
  organizationId: string;
  importJobId: string | null;
  dataType: string;
  mindbodyId: string;
  reason: string;
  rawData: string | null;
  createdAt: string;
}

interface SkippedRecordsResponse {
  records: SkippedRecord[];
  total: number;
}

export default function SkippedRecords() {
  const [dataTypeFilter, setDataTypeFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<SkippedRecordsResponse>({
    queryKey: ["/api/mindbody/import/skipped-records", dataTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dataTypeFilter !== "all") {
        params.set("dataType", dataTypeFilter);
      }
      params.set("limit", "1000");

      return await apiRequest("GET", `/api/mindbody/import/skipped-records?${params}`);
    },
  });

  const handleExportCSV = () => {
    if (!data?.records) return;

    const headers = ["Mindbody ID", "Data Type", "Reason", "Date Skipped"];
    const rows = data.records.map(record => [
      record.mindbodyId,
      record.dataType,
      record.reason,
      format(new Date(record.createdAt), "yyyy-MM-dd HH:mm:ss"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skipped-records-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Skipped Import Records</h1>
        <p className="text-muted-foreground">
          View records that were skipped during import due to data quality issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5" />
                Skipped Records
              </CardTitle>
              <CardDescription>
                Records that couldn't be imported from Mindbody
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={dataTypeFilter}
                onValueChange={setDataTypeFilter}
                data-testid="select-data-type-filter"
              >
                <SelectTrigger className="w-[180px]" data-testid="trigger-data-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-all">All Types</SelectItem>
                  <SelectItem value="client" data-testid="option-client">Clients</SelectItem>
                  <SelectItem value="class" data-testid="option-class">Classes</SelectItem>
                  <SelectItem value="visit" data-testid="option-visit">Visits</SelectItem>
                  <SelectItem value="sale" data-testid="option-sale">Sales</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportCSV}
                disabled={!data?.records || data.records.length === 0}
                variant="outline"
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load skipped records. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : data?.records && data.records.length > 0 ? (
            <div>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {data.records.length} of {data.total} skipped records
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mindbody ID</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date Skipped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.map((record) => (
                      <TableRow key={record.id} data-testid={`row-skipped-record-${record.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-mindbody-id-${record.id}`}>
                          {record.mindbodyId}
                        </TableCell>
                        <TableCell data-testid={`text-data-type-${record.id}`}>
                          <span className="capitalize">{record.dataType}</span>
                        </TableCell>
                        <TableCell className="max-w-md" data-testid={`text-reason-${record.id}`}>
                          <span className="text-muted-foreground">{record.reason}</span>
                        </TableCell>
                        <TableCell data-testid={`text-date-${record.id}`}>
                          {format(new Date(record.createdAt), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileWarning className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Skipped Records</h3>
              <p className="text-muted-foreground">
                {dataTypeFilter === "all"
                  ? "All import records were processed successfully!"
                  : `No ${dataTypeFilter} records were skipped.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
