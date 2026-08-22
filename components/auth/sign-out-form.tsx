import { logout } from "@/app/login/actions";

type SignOutFormProps = {
  className?: string;
};

export function SignOutForm({ className = "" }: SignOutFormProps) {
  return (
    <form action={logout}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
