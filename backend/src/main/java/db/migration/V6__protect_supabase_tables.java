package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** The mobile app uses the authenticated Spring API, never public PostgREST access. */
public class V6__protect_supabase_tables extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        if (!context.getConnection().getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
        for (String table : new String[]{"users", "user_profiles", "plans", "plan_items", "meals", "meal_items", "products",
                "water_logs", "activity_sessions", "notification_events", "missed_events", "member_access_grants", "meal_posts", "media_objects"}) {
            try (var statement = context.getConnection().createStatement()) {
                statement.execute("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY");
            }
        }
    }
}
