"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SUBJECTS } from "@/lib/subjects";

export function SubjectSelect({
  value,
  onChange,
  placeholder = "Selecione a matéria",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {SUBJECTS.map((subject) => (
          <SelectItem key={subject.name} value={subject.name}>
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SubjectChecklist({
  value,
  onChange,
}: {
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SUBJECTS.map((subject) => {
        const checked = subject.name in value;
        return (
          <div key={subject.name} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  const next = { ...value };
                  if (nextChecked) next[subject.name] = 3;
                  else delete next[subject.name];
                  onChange(next);
                }}
              />
              <span className="size-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              <Label>{subject.name}</Label>
            </div>
            {checked ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Dificuldade {value[subject.name]}</p>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[value[subject.name]]}
                  onValueChange={(nextValue) => {
                    const difficulty = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                    onChange({ ...value, [subject.name]: difficulty });
                  }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
