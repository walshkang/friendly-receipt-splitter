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
import { ReceiptUpload } from "@/components/ReceiptUpload";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface GroupMember {
  user_id: string;
  profiles: Profile;
}

interface ReceiptDetails {
  id: string;
  description: string | null;
  total_amount: number;
  date: string;
  profiles: {
    full_name: string | null;
  };
}

interface GroupData {
  group: {
    id: string;
    name: string;
    group_members: GroupMember[];
  };
  receipts: ReceiptDetails[];
}

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

  const { data: groupData, isLoading: isLoadingGroup } = useQuery<GroupData>({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (session?.user?.id) {
        const { data: group, error: groupError } = await supabase
          .from("groups")
          .select(`
            id,
            name,
            group_members (
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

        return {
          group: {
            ...group,
            group_members: group.group_members.map((member: any) => ({
              user_id: member.user_id,
              profiles: member.profiles[0] || { full_name: null, avatar_url: null }
            }))
          },
          receipts: receipts.map((receipt: any) => ({
            ...receipt,
            profiles: receipt.profiles[0] || { full_name: null }
          }))
        };
      } else {
        const localGroups = localStorage.getItem("local_groups");
        const groups = localGroups ? JSON.parse(localGroups) : [];
        const group = groups.find((g: any) => g.id === groupId);
        
        if (!group) throw new Error("Group not found");
        
        const localReceipts = localStorage.getItem(`receipts_${groupId}`);
        const receipts = localReceipts ? JSON.parse(localReceipts) : [];
        
        const localMembers = localStorage.getItem(`members_${groupId}`);
        const members = localMembers ? JSON.parse(localMembers) : [];
        
        return {
          group: {
            ...group,
            group_members: members.map((member: any) => ({
              user_id: member.id,
              profiles: {
                full_name: member.name,
                avatar_url: null
              }
            }))
          },
          receipts: receipts.map((receipt: any) => ({
            ...receipt,
            profiles: { full_name: receipt.added_by }
          }))
        };
      }
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (memberName: string) => {
      if (session?.user?.id) {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", memberName)
          .single();

        if (userError) throw new Error("User not found");

        const { error: memberError } = await supabase
          .from("group_members")
          .insert([{ group_id: groupId, user_id: userData.id }]);

        if (memberError) throw memberError;
        
        return userData;
      } else {
        const newMember = {
          id: crypto.randomUUID(),
          name: memberName
        };
        
        const localMembers = localStorage.getItem(`members_${groupId}`);
        const members = localMembers ? JSON.parse(localMembers) : [];
        members.push(newMember);
        localStorage.setItem(`members_${groupId}`, JSON.stringify(members));
        
        return newMember;
      }
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
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("receipts")
          .insert([{
            group_id: groupId,
            description: receiptData.description,
            total_amount: parseFloat(receiptData.totalAmount),
            date: receiptData.date,
            uploaded_by: session.user.id,
            paid_by: session.user.id,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const newReceipt = {
          id: crypto.randomUUID(),
          description: receiptData.description,
          total_amount: parseFloat(receiptData.totalAmount),
          date: receiptData.date,
          added_by: "Guest User"
        };
        
        const localReceipts = localStorage.getItem(`receipts_${groupId}`);
        const receipts = localReceipts ? JSON.parse(localReceipts) : [];
        receipts.push(newReceipt);
        localStorage.setItem(`receipts_${groupId}`, JSON.stringify(receipts));
        
        return newReceipt;
      }
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

  const handleReceiptUploadSuccess = (receiptData: {
    total_amount: number;
    date: string;
    description: string;
    image_url?: string;
    items: Array<{
      description: string;
      amount: number;
    }>;
  }) => {
    addReceiptMutation.mutate({
      description: receiptData.description,
      totalAmount: receiptData.total_amount.toString(),
      date: receiptData.date,
      image_url: receiptData.image_url,
    });
  };

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
              {groupData?.group.group_members.map((member) => (
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
                  placeholder={session ? "Enter user ID" : "Enter member name"}
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
              Add Receipt Manually
            </Button>

            {isAddingReceipt ? (
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
            ) : (
              <div className="mb-6">
                <ReceiptUpload
                  groupId={groupId!}
                  onUploadSuccess={handleReceiptUploadSuccess}
                />
              </div>
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
                {groupData?.receipts?.map((receipt) => (
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
