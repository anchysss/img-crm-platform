import { router } from "./trpc";
import { partnersRouter } from "./routers/partners";
import { contactsRouter } from "./routers/contacts";
import { activitiesRouter } from "./routers/activities";
import { opportunitiesRouter } from "./routers/opportunities";
import { pipelineRouter } from "./routers/pipeline";
import { mediabookRouter } from "./routers/mediabook";
import { invoicesRouter } from "./routers/invoices";
import { handoffRouter } from "./routers/handoff";
import { dashboardRouter } from "./routers/dashboard";
import { gdprRouter } from "./routers/gdpr";
import { usersRouter } from "./routers/users";
import { vehiclesRouter } from "./routers/vehicles";
import { campaignsRouter } from "./routers/campaigns";
import { notificationsRouter } from "./routers/notifications";
import { auditRouter } from "./routers/audit";
import { reportsRouter } from "./routers/reports";
import { lookupsRouter } from "./routers/lookups";

export const appRouter = router({
  partners: partnersRouter,
  contacts: contactsRouter,
  activities: activitiesRouter,
  opportunities: opportunitiesRouter,
  pipeline: pipelineRouter,
  mediabook: mediabookRouter,
  invoices: invoicesRouter,
  handoff: handoffRouter,
  dashboard: dashboardRouter,
  gdpr: gdprRouter,
  users: usersRouter,
  vehicles: vehiclesRouter,
  campaigns: campaignsRouter,
  notifications: notificationsRouter,
  audit: auditRouter,
  reports: reportsRouter,
  lookups: lookupsRouter,
});

export type AppRouter = typeof appRouter;
