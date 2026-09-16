import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-surface px-4">
    <div className="w-full max-w-md rounded-lg border border-border bg-background p-8 text-center shadow-sm">
      <p className="numeric text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you were looking for does not exist or has moved.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
