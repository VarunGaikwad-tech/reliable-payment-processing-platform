import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowLeftRight, Bell, LayoutDashboard, LogOut, Menu, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transfer", label: "Transfer money", icon: ArrowLeftRight },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

function initialsOf(name?: string, email?: string) {
  const source = name || email || "";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-surface",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const userBlock = (
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-3 px-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initialsOf(user?.name, user?.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user?.name || "Signed in"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <Button variant="ghost" className="mt-3 w-full justify-start text-muted-foreground" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-border bg-background p-4 lg:flex">
        <div>
          <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              P
            </span>
            <span className="font-semibold tracking-tight">PayLedger</span>
          </Link>
          <div className="mt-6">
            <NavItems />
          </div>
        </div>
        {userBlock}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon" aria-label="Open navigation">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col justify-between bg-background p-4">
                <div className="mt-6">
                  <NavItems onNavigate={() => setMobileOpen(false)} />
                </div>
                {userBlock}
              </SheetContent>
            </Sheet>
            <span className="font-semibold tracking-tight lg:hidden">PayLedger</span>
          </div>
          <Button asChild size="sm">
            <Link to="/transfer">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
