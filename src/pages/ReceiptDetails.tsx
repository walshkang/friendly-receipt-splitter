
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
import { format } from "date-fns";

interface ReceiptDetails {
  id: string;
  description: string;
  total_amount: number;
  date: string;
  image_url?: string;
  items: Array<{
    description: string;
    amount: number;
  }>;
  profiles: {
    full_name: string | null;
  };
}

const ReceiptDetails = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  
  const { data: receipt, isLoading } = useQuery<ReceiptDetails>({
    queryKey: ["receipt", receiptId],
    queryFn: async () => {
      if (!receiptId) throw new Error("Receipt ID is required");

      const { data: receipt, error } = await supabase
        .from("receipts")
        .select(`
          id,
          description,
          total_amount,
          date,
          image_url,
          items:receipt_items(
            description,
            amount
          ),
          profiles:uploaded_by(
            full_name
          )
        `)
        .eq("id", receiptId)
        .single();

      if (error) throw error;

      return {
        ...receipt,
        profiles: receipt.profiles?.[0] || { full_name: null },
        items: receipt.items || []
      };
    },
    enabled: !!receiptId
  });

  if (isLoading) {
    return <div>Loading receipt details...</div>;
  }

  if (!receipt) {
    return <div>Receipt not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{receipt.description || "Receipt Details"}</CardTitle>
          <CardDescription>
            Added by {receipt.profiles?.full_name || "Unknown"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {receipt.image_url && (
              <div className="w-full max-w-lg mx-auto">
                <img
                  src={receipt.image_url}
                  alt="Receipt"
                  className="w-full h-auto rounded-lg shadow"
                />
              </div>
            )}

            <div className="grid gap-4">
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{format(new Date(receipt.date), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Amount:</span>
                <span>${receipt.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {receipt.items && receipt.items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        ${item.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptDetails;
