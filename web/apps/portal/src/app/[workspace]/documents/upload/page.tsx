"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Upload, ArrowLeft, Check, X, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { useUploadArtifact } from "@/hooks/use-artifacts";
import { useScopeStore } from "@/lib/stores/scope-store";

const ARTIFACT_TYPES = [
  { label: "Research Article", value: "RESEARCH_ARTICLE" },
  { label: "Scientific Document", value: "SCIENTIFIC_DOCUMENT" },
  { label: "Scientific Presentation", value: "SCIENTIFIC_PRESENTATION" },
  { label: "Generic Presentation", value: "GENERIC_PRESENTATION" },
  { label: "Disclosure Document", value: "DISCLOSURE_DOCUMENT" },
  { label: "Minutes of Meeting", value: "MINUTE_OF_MEETING" },
  { label: "Unclassified", value: "UNCLASSIFIED" },
];

type FileStatus = "pending" | "uploading" | "success" | "error";

export default function UploadPage() {
  const { workspace } = useParams<{ workspace: string }>();
  const router = useRouter();
  const uploadMutation = useUploadArtifact();
  const { defaultScope } = useScopeStore();
  const fileUploadRef = useRef<FileUpload>(null);

  const [artifactType, setArtifactType] = useState("RESEARCH_ARTICLE");
  const [sourceUri, setSourceUri] = useState("");
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>({});
  const [isUploading, setIsUploading] = useState(false);

  const isBatch = Object.keys(fileStatuses).length > 1;

  const handleUpload = useCallback(
    async (event: FileUploadHandlerEvent) => {
      const files = event.files;
      if (!files.length) return;

      // Single file — keep original behavior
      if (files.length === 1) {
        const file = files[0];
        try {
          const result = await uploadMutation.mutateAsync({
            file,
            artifactType,
            sourceUri: sourceUri || undefined,
            visibility: defaultScope,
          });
          router.push(`/${workspace}/documents/${result.artifact_id}`);
        } catch {
          // Error shown via uploadMutation.error
        }
        return;
      }

      // Multiple files — sequential upload with per-file status
      setIsUploading(true);
      const statuses: Record<string, FileStatus> = {};
      for (const f of files) statuses[f.name] = "pending";
      setFileStatuses({ ...statuses });

      for (const file of files) {
        setFileStatuses((prev) => ({ ...prev, [file.name]: "uploading" }));
        try {
          await uploadMutation.mutateAsync({
            file,
            artifactType,
            sourceUri: sourceUri || undefined,
            visibility: defaultScope,
          });
          setFileStatuses((prev) => ({ ...prev, [file.name]: "success" }));
        } catch {
          setFileStatuses((prev) => ({ ...prev, [file.name]: "error" }));
        }
      }

      setIsUploading(false);
    },
    [artifactType, sourceUri, defaultScope, uploadMutation, router, workspace],
  );

  const doneCount = Object.values(fileStatuses).filter(
    (s) => s === "success" || s === "error",
  ).length;
  const totalCount = Object.keys(fileStatuses).length;
  const allDone = isBatch && doneCount === totalCount && !isUploading;

  return (
    <div>
      <Button
        label="Documents"
        icon={<ArrowLeft className="h-3.5 w-3.5" />}
        onClick={() => router.push(`/${workspace}/documents`)}
        text
        severity="secondary"
        className="mb-4"
      />

      <PageHeader
        icon={Upload}
        title="Upload Documents"
        subtitle="Upload one or more documents for automated analysis and extraction"
      />

      <Card className="max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Document Type
            </label>
            <Dropdown
              value={artifactType}
              options={ARTIFACT_TYPES}
              onChange={(e) => setArtifactType(e.value)}
              className="w-full"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Source URI
              <span className="ml-1 text-text-muted font-normal">(optional)</span>
            </label>
            <InputText
              value={sourceUri}
              onChange={(e) => setSourceUri(e.target.value)}
              placeholder="https://..."
              className="w-full"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Files
            </label>
            <FileUpload
              ref={fileUploadRef}
              name="files"
              accept=".pdf,.pptx,.ppt,.doc,.docx"
              maxFileSize={100_000_000}
              multiple
              customUpload
              uploadHandler={handleUpload}
              auto={false}
              chooseLabel="Select Files"
              uploadLabel="Upload"
              cancelLabel="Cancel"
              disabled={isUploading}
              emptyTemplate={
                <div className="flex flex-col items-center py-8 text-center">
                  <Upload className="mb-3 h-10 w-10 text-text-muted" />
                  <p className="text-sm font-medium text-text-secondary">
                    Drag and drop files here
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    PDF, PPTX, DOC, DOCX up to 100MB each
                  </p>
                </div>
              }
            />
          </div>

          {/* Single-file status messages */}
          {!isBatch && uploadMutation.isPending && (
            <Message
              severity="info"
              text="Uploading..."
              icon="pi pi-spin pi-spinner"
            />
          )}

          {!isBatch && uploadMutation.isError && (
            <Message
              severity="error"
              text={uploadMutation.error?.message ?? "Upload failed"}
            />
          )}

          {!isBatch && uploadMutation.isSuccess && (
            <Message
              severity="success"
              text="Upload successful! Redirecting..."
            />
          )}

          {/* Multi-file progress */}
          {isBatch && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>
                  {isUploading
                    ? `Uploading ${doneCount + 1} of ${totalCount}...`
                    : `${doneCount} of ${totalCount} complete`}
                </span>
                <span>
                  {Object.values(fileStatuses).filter((s) => s === "error").length > 0 &&
                    `${Object.values(fileStatuses).filter((s) => s === "error").length} failed`}
                </span>
              </div>
              <div className="divide-y divide-surface-border rounded border border-surface-border">
                {Object.entries(fileStatuses).map(([name, status]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    {status === "pending" && (
                      <span className="h-4 w-4 rounded-full border-2 border-surface-border" />
                    )}
                    {status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {status === "success" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {status === "error" && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
              {allDone && (
                <Button
                  label="View Documents"
                  icon={<ArrowLeft className="h-3.5 w-3.5" />}
                  onClick={() => router.push(`/${workspace}/documents`)}
                  className="mt-2"
                />
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
