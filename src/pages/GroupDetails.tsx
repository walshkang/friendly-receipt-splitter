
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Receipt, Users, ArrowLeft, PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";

const GroupDetails = () => {
  const { groupId } = useParams();
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [isAddingReceipt, setIsAddingReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState({
    description: "",
    totalAmount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: groupData, isLoading: isLoadingGroup } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          group_members!inner (
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;

      const { data: receipts, error: receiptsError } = await supabase
        .from("receipts")
        .select(`
          id,
          description,
          total_amount,
          date,
          profiles:uploaded_by (
            full_name
          )
        `)
        .eq("group_id", groupId)
        .order("date", { ascending: false });

      if (receiptsError) throw receiptsError;

      return { group, receipts };
    },
    enabled: !!groupId && !!session?.user?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      // First get the user ID from the email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", email)
        .single();

      if (userError) throw new Error("User not found");

      // Then add them to the group
      const { error: memberError } = await supabase
        .from("group_members")
        .insert([{ group_id: groupId, user_id: userData.id }]);

      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setNewEmail("");
      toast({
        title: "Success",
        description: "Member added successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add member: " + error.message,
      });
    },
  });

  const addReceiptMutation = useMutation({
    mutationFn: async (receiptData: typeof receiptDetails) => {
      const { data, error } = await supabase
        .from("receipts")
        .insert([{
          group_id: groupId,
          description: receiptData.description,
          total_amount: parseFloat(receiptData.totalAmount),
          date: receiptData.date,
          uploaded_by: session?.user?.id,
          paid_by: session?.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setIsAddingReceipt(false);
      setReceiptDetails({
        description: "",
        totalAmount: "",
        date: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Success",
        description: "Receipt added successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add receipt: " + error.message,
      });
    },
  });

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to view group details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingGroup) {
    return <div>Loading group details...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/groups")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Groups
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {groupData?.group.name} - Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupData?.group.group_members.map((member: any) => (
                <div key={member.user_id} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    {member.profiles?.full_name?.[0] || "?"}
                  </div>
                  <span>{member.profiles?.full_name || "Unknown User"}</span>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addMemberMutation.mutate(newEmail);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Enter user ID"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button type="submit" disabled={addMemberMutation.isPending}>
                  Add
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="mb-4"
              onClick={() => setIsAddingReceipt(!isAddingReceipt)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Receipt
            </Button>

            {isAddingReceipt && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addReceiptMutation.mutate(receiptDetails);
                }}
                className="mb-6 space-y-4"
              >
                <Input
                  placeholder="Description"
                  value={receiptDetails.description}
                  onChange={(e) =>
                    setReceiptDetails({
                      ...receiptDetails,
                      description: e.target.value,
                    })
                  }
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Total Amount"
                  value={receiptDetails.totalAmount}
                  onChange={(e) =>
                    setReceiptDetails({
                      ...receiptDetails,
                      totalAmount: e.target.value,
                    })
                  }
                  required
                />
                <Input
                  type="date"
                  value={receiptDetails.date}
                  onChange={(e) =>
                    setReceiptDetails({
                      ...receiptDetails,
                      date: e.target.value,
                    })
                  }
                  required
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={addReceiptMutation.isPending}
                >
                  Add Receipt
                </Button>
              </form>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Added By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupData?.receipts.map((receipt) => (
                  <TableRow
                    key={receipt.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/receipts/${receipt.id}`)}
                  >
                    <TableCell>
                      {format(new Date(receipt.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{receipt.description}</TableCell>
                    <TableCell>
                      ${receipt.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {receipt.profiles?.full_name || "Unknown"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupDetails;
