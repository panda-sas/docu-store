import { ProgressSpinner } from "primereact/progressspinner";

export default function WorkspaceLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <ProgressSpinner
        style={{ width: "2rem", height: "2rem" }}
        strokeWidth="3"
      />
    </div>
  );
}
