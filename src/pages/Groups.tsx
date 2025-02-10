
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Users, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";

const Groups = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newGroupName, setNewGroupName] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          group_members!inner (user_id)
        `)
        .eq("group_members.user_id", session?.user?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      // First create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert([{ name }])
        .select()
        .single();

      if (groupError) throw groupError;

      // Then add the creator as a member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert([{ group_id: group.id, user_id: session?.user?.id }]);

      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setNewGroupName("");
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create group: " + error.message,
      });
    },
  });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a group name",
      });
      return;
    }
    createGroupMutation.mutate(newGroupName);
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to manage your groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Your Groups</h1>
        <form onSubmit={handleCreateGroup} className="flex gap-4">
          <Input
            placeholder="Enter group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <Button type="submit" disabled={createGroupMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div>Loading groups...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups?.map((group) => (
            <Card key={group.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/groups/${group.id}`)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {group.name}
                </CardTitle>
                <CardDescription>
                  Click to view receipts and members
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;
