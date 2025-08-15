-- STEP 5: Verify Installation
-- Run this last to confirm everything is set up

-- Check all tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check row counts
SELECT 'Setup Complete!' as status,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM leagues) as leagues_count,
    (SELECT COUNT(*) FROM teams) as teams_count,
    (SELECT COUNT(*) FROM players) as players_count;

-- Verify indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;