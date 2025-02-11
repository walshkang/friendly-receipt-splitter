
import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptUploadProps {
  groupId: string;
  onUploadSuccess: (receiptData: {
    total_amount: number;
    date: string;
    description: string;
    items: Array<{
      description: string;
      amount: number;
    }>;
  }) => void;
}

export function ReceiptUpload({ groupId, onUploadSuccess }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type.startsWith("image/") ||
        selectedFile.type === "application/pdf"
      ) {
        setFile(selectedFile);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload an image (JPEG, PNG) or PDF file",
        });
      }
    }
  };

  const processReceipt = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      // Upload to Supabase Storage if authenticated
      let fileUrl = "";
      if (window.sessionStorage.getItem("supabase.auth.token")) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("receipts")
          .getPublicUrl(fileName);
          
        fileUrl = publicUrl;
      }

      // Process with OpenAI
      const response = await supabase.functions.invoke("process-receipt", {
        body: { image: base64 },
      });

      if (response.error) throw response.error;

      const data = response.data;
      onUploadSuccess({
        ...data,
        image_url: fileUrl,
      });

      toast({
        title: "Success",
        description: "Receipt processed successfully",
      });
    } catch (error) {
      console.error("Error processing receipt:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process receipt. Please try again.",
      });
    } finally {
      setIsProcessing(false);
      setFile(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Receipt</CardTitle>
        <CardDescription>
          Upload an image or PDF of your receipt to automatically extract details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="receipt-upload"
            />
            <Button
              asChild
              variant="outline"
              className="w-full h-32 flex flex-col gap-2"
            >
              <label htmlFor="receipt-upload">
                <Upload className="h-6 w-6" />
                <span>Click to upload</span>
                <span className="text-xs text-muted-foreground">
                  JPEG, PNG, or PDF
                </span>
              </label>
            </Button>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-2 border rounded">
              <FileText className="h-4 w-4" />
              <span className="flex-1 truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={processReceipt}
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Process Receipt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
