import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

export default function OrgAnalyticsRedirect() {
  redirect(ROUTES.ORGANIZATION_ANALYTICS);
}
