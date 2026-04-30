import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { LessonForm } from "./LessonForm";
import { useDeleteLesson, useUpdateLesson, type VocalLesson } from "@/lib/vocal-api";

interface Props {
  lessons: VocalLesson[];
}

export function LessonList({ lessons }: Props) {
  const [editing, setEditing] = useState<VocalLesson | null>(null);
  const [deleting, setDeleting] = useState<VocalLesson | null>(null);

  const deleteLesson = useDeleteLesson();
  const updateLesson = useUpdateLesson();

  if (lessons.length === 0) {
    return <p className="text-sm text-body">No lessons logged yet.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {lessons.map((lesson) => (
          <Card key={lesson.id} padding="sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium shrink-0 whitespace-nowrap text-heading">
                  {lesson.date}
                </span>
                {lesson.repertoire && lesson.repertoire.length > 0 && (
                  <span className="text-xs truncate text-body">
                    {lesson.repertoire.join(", ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton aria-label="Edit lesson" onClick={() => setEditing(lesson)}>
                  <Pencil size={14} />
                </IconButton>
                <IconButton aria-label="Delete lesson" onClick={() => setDeleting(lesson)}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>

            {lesson.reflection && (
              <p className="mt-1 text-xs whitespace-pre-wrap text-body">{lesson.reflection}</p>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <Dialog open onClose={() => setEditing(null)} title="Edit lesson">
          <LessonForm
            initial={editing}
            isLoading={updateLesson.isPending}
            submitLabel="Update"
            onSubmit={(data) => {
              updateLesson.mutate(
                { id: editing.id, body: data },
                { onSuccess: () => setEditing(null) }
              );
            }}
          />
        </Dialog>
      )}

      {deleting && (
        <ConfirmDialog
          open
          title="Delete lesson"
          message={`Delete the lesson logged on ${deleting.date}? This cannot be undone.`}
          confirmLabel="Delete"
          isPending={deleteLesson.isPending}
          onConfirm={() => {
            deleteLesson.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
