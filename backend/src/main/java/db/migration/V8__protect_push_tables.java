package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V8__protect_push_tables extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        if (!context.getConnection().getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
        for (String table : new String[]{"notification_preferences", "push_devices", "push_deliveries"}) {
            try (var statement = context.getConnection().createStatement()) {
                statement.execute("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY");
            }
        }
    }
}
