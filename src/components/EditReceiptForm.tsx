
import { useState } from "react";
import { Plus, Minus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReceiptItem {
  description: string;
  amount: number;
}

interface EditReceiptFormProps {
  initialData?: {
    description: string;
    total_amount: number;
    date: string;
    items: ReceiptItem[];
  };
  imageUrl?: string;
  onSave: (data: {
    description: string;
    total_amount: number;
    date: string;
    image_url?: string;
  }) => void;
  onCancel: () => void;
}

export function EditReceiptForm({ initialData, imageUrl, onSave, onCancel }: EditReceiptFormProps) {
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ReceiptItem[]>(
    initialData?.items || [{ description: "", amount: 0 }]
  );

  const addItem = () => {
    setItems([...items, { description: "", amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === "amount" ? parseFloat(value) || 0 : value,
    };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description,
      total_amount: calculateTotal(),
      date,
      image_url: imageUrl,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Receipt Details</CardTitle>
        <CardDescription>
          Review and edit the receipt information before saving
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Receipt description"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Items</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Item description"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={item.amount || ""}
                    onChange={(e) => updateItem(index, "amount", e.target.value)}
                    placeholder="Amount"
                    step="0.01"
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Receipt
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
