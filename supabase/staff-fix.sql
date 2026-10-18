-- ==============================================================================
-- STAFF: reliable "add staff" + activate   (safe to re-run)
-- Run in Supabase -> SQL Editor with role = postgres. Run AFTER staff-auth.sql.
-- The admin panel calls this when you add a staff member, so the new account is
-- always created ACTIVE with the chosen role (the old direct update could silently
-- change 0 rows, leaving the account inactive: "खाता सक्रिय छैन").
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_staff(
    p_user_id UUID, p_role TEXT, p_name TEXT, p_phone TEXT, p_bio TEXT
) RETURNS VOID AS $$
BEGIN
    IF public.get_auth_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Only a Super Admin can manage staff';
    END IF;
    IF p_role NOT IN ('super_admin', 'editor', 'reporter') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    INSERT INTO public.users_profile (user_id, full_name, role, email, phone, bio, is_active)
    SELECT u.id, COALESCE(NULLIF(p_name, ''), u.email), p_role::user_role_type, u.email,
           NULLIF(p_phone, ''), NULLIF(p_bio, ''), TRUE
    FROM auth.users u
    WHERE u.id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        bio = EXCLUDED.bio,
        email = EXCLUDED.email,
        is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_set_staff(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_staff(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- CHECK: one row
SELECT proname FROM pg_proc WHERE proname = 'admin_set_staff';
