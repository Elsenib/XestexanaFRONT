import { LocaleProvider } from "../components/LocaleProvider";
import { RolePortal } from "../components/role-portal";

export default function HomePage() {
  return (
    <LocaleProvider>
      <RolePortal />
    </LocaleProvider>
  );
}