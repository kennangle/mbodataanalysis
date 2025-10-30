import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PricingOption {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  onlinePrice: string | null;
  taxRate: string | null;
  taxIncluded: boolean;
  defaultTimeLength: number | null;
  type: string | null;
}

export function PricingOptionsTable() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ pricingOptions: PricingOption[]; count: number }>({
    queryKey: ["/api/pricing-options"],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pricing-options/import");
      const result = await response.json() as { success: boolean; imported: number; updated: number };
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-options"] });
      toast({
        title: "Import Successful",
        description: `Imported ${result.imported} new pricing options, updated ${result.updated} existing options`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import pricing options from Mindbody",
        variant: "destructive",
      });
    },
  });

  const filteredPricingOptions = (data?.pricingOptions || []).filter(
    (option) =>
      option.name.toLowerCase().includes(search.toLowerCase()) ||
      option.description?.toLowerCase().includes(search.toLowerCase()) ||
      option.type?.toLowerCase().includes(search.toLowerCase())
  );

  const exportToExcel = () => {
    const exportData = filteredPricingOptions.map((option) => ({
      "Name": option.name,
      "Description": option.description || "",
      "Price": option.price ? `$${option.price}` : "",
      "Online Price": option.onlinePrice ? `$${option.onlinePrice}` : "",
      "Tax Rate": option.taxRate ? `${option.taxRate}%` : "",
      "Tax Included": option.taxIncluded ? "Yes" : "No",
      "Duration (min)": option.defaultTimeLength || "",
      "Type": option.type || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pricing Options");

    const fileName = `pricing_options_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Pricing Options</CardTitle>
              <CardDescription>View all services and pricing from Mindbody</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pricing options..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-pricing"
                />
              </div>
              <Button
                variant="outline"
                size="default"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                data-testid="button-import-pricing"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${importMutation.isPending ? 'animate-spin' : ''}`} />
                Import
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={exportToExcel}
                disabled={filteredPricingOptions.length === 0}
                data-testid="button-export-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading pricing options...</div>
          </div>
        ) : filteredPricingOptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">No pricing options found</p>
            <p className="text-sm text-muted-foreground">
              Click Import to fetch pricing options from Mindbody
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Online Price</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPricingOptions.map((option) => (
                  <TableRow key={option.id} data-testid={`row-pricing-${option.id}`}>
                    <TableCell className="font-medium">
                      {option.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                      {option.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {option.price ? `$${option.price}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {option.onlinePrice ? `$${option.onlinePrice}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {option.defaultTimeLength ? `${option.defaultTimeLength} min` : "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {option.type || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
