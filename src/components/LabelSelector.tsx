import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Label {
  id: string;
  name: string;
}

interface LabelSelectorProps {
  labels: Label[];
  isLoading: boolean;
  selectedLabel: string | null;
  onSelect: (labelId: string) => void;
}

export function LabelSelector({ labels, isLoading, selectedLabel, onSelect }: LabelSelectorProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading labels...</div>;
  }

  const sorted = [...labels].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Select value={selectedLabel ?? undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a Gmail label" />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((label) => (
          <SelectItem key={label.id} value={label.id}>
            {label.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
