import { useState } from "react";
import type { KeyboardEvent } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormTextareaField } from "@/components/ui/FormTextareaField";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import { Tag } from "@/components/ui/Tag";
import type { VocalLesson, VocalLessonCreate, VocalLessonUpdate } from "@/lib/vocal-api";

interface Props {
  initial?: VocalLesson;
  onSubmit: (data: VocalLessonCreate | VocalLessonUpdate) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function LessonForm({ initial, onSubmit, isLoading, submitLabel = "Save" }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(initial?.date ?? today);
  const [repertoire, setRepertoire] = useState<string[]>(initial?.repertoire ?? []);
  const [pieceInput, setPieceInput] = useState("");
  const [reflection, setReflection] = useState(initial?.reflection ?? "");

  function addPiece() {
    const trimmed = pieceInput.trim();
    if (trimmed && !repertoire.includes(trimmed)) {
      setRepertoire([...repertoire, trimmed]);
    }
    setPieceInput("");
  }

  function handlePieceKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addPiece();
    }
  }

  function removePiece(piece: string) {
    setRepertoire(repertoire.filter((p) => p !== piece));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Flush any pending piece input
    const finalRepertoire = [...repertoire];
    const pending = pieceInput.trim();
    if (pending && !finalRepertoire.includes(pending)) {
      finalRepertoire.push(pending);
    }
    onSubmit({
      date,
      repertoire: finalRepertoire.length > 0 ? finalRepertoire : undefined,
      reflection: reflection || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <FormFieldLabel>Date</FormFieldLabel>
        <FormInputField
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <FormFieldLabel>Repertoire</FormFieldLabel>
        <div className="flex gap-2">
          <FormInputField
            type="text"
            value={pieceInput}
            onChange={(e) => setPieceInput(e.target.value)}
            onKeyDown={handlePieceKeyDown}
            placeholder="Add a piece, press Enter"
            className="flex-1"
          />
          <FormButton intent="secondary" onClick={addPiece}>
            Add
          </FormButton>
        </div>
        {repertoire.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {repertoire.map((piece) => (
              <Tag key={piece} onRemove={() => removePiece(piece)} removeLabel={`Remove ${piece}`}>
                {piece}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <FormFieldLabel>Notes</FormFieldLabel>
        <FormTextareaField
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          placeholder="Notes / reflection…"
        />
      </div>

      <FormButton intent="submit" disabled={isLoading}>
        {isLoading ? "Saving…" : submitLabel}
      </FormButton>
    </form>
  );
}
