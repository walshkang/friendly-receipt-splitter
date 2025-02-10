
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Receipt, Users, LogIn, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();

  const handleUploadReceipt = () => {
    navigate("/groups");
  };

  const handleCreateGroup = () => {
    navigate("/groups");
  };

  const handleExport = () => {
    toast({
      title: "Coming Soon",
      description: "Export functionality will be available soon.",
    });
  };

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto text-center mb-12"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Split Expenses Effortlessly
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Upload receipts, manage groups, and keep track of shared expenses with ease.
        </p>
        {!session && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to save your data
              </Link>
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
      >
        <Card className="glass-card card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Add Receipt
            </CardTitle>
            <CardDescription>
              Upload a receipt or enter expenses manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-lg">
              <Button variant="outline" onClick={handleUploadReceipt}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Upload Receipt
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Manage Groups
            </CardTitle>
            <CardDescription>
              Create or join groups to split expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center">
              <Button onClick={handleCreateGroup}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create New Group
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {session 
            ? "Start by creating a group or uploading a receipt" 
            : "No account needed - start splitting expenses right away!"}
        </p>
      </motion.div>
    </div>
  );
};

export default Index;
