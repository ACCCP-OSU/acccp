import ApplicationUsage from "@/components/ui/application-usage";
import DocumentWorkspace from "@/components/ui/document-workspace";

export default function DashboardPage(): React.JSX.Element {
  return (
    <main className="mx-auto my-8 md:mx-16 lg:mx-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-bold md:text-2xl">
          Accessible Canvas Content Conversion Platform
        </h1>
        <ApplicationUsage />
      </div>
      <DocumentWorkspace />
    </main>
  );
}
